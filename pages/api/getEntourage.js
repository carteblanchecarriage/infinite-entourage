const { buildEntouragePrompt } = require('../../lib/promptBuilder');
const { createClient } = require('@supabase/supabase-js');

const FLUX_VERSION = '6e4a938f85952bdabcc15aa329178c4d681c52bf25a0342403287dc26944661d';
const REMBG_VERSION = 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003';
const API_TOKEN = process.env.REPLICATE_API_TOKEN;
const ADMIN_KEY = process.env.ADMIN_GENERATION_KEY;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

const COST_PER_IMAGE = 1;
const FREE_LIMIT = 3;
const DAILY_MS = 24 * 60 * 60 * 1000;

// IP rate limiting
const ipTracker = new Map();
const IP_FREE_LIMIT = 5;

// Validation helper functions
function sanitizeString(str, maxLength = 500) {
  if (!str || typeof str !== 'string') return '';
  
  const trimmed = str.trim().slice(0, maxLength);
  
  // Basic XSS prevention - remove dangerous patterns
  return trimmed
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<[^>]+>/g, ''); // Strip HTML tags
}

function isValidFingerprint(fp) {
  if (!fp || typeof fp !== 'string') return false;
  // Fingerprint should be base64-like, 32 chars max
  return fp.length <= 32 && /^[A-Za-z0-9+/=]+$/.test(fp);
}

function isValidAdminKey(key) {
  if (!key || typeof key !== 'string') return false;
  // Admin key should be reasonable length
  return key.length >= 20 && key.length <= 256;
}

function isValidStyle(style) {
  const validStyles = ['realistic', 'illustration', 'silhouette'];
  return validStyles.includes(style);
}

async function createPrediction(version, input) {
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ version, input }),
  });
  return res.json();
}

async function waitForPrediction(id) {
  let result;
  do {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Token ${API_TOKEN}` },
    });
    result = await res.json();
  } while (result.status === 'starting' || result.status === 'processing');
  return result;
}

// Get or create user in Supabase
async function getOrCreateUser(fingerprint) {
  // Try to find existing user
  let { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('fingerprint', fingerprint)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user:', error);
    return null;
  }
  
  // Create new user if not found
  if (!user) {
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([
        { 
          fingerprint: fingerprint,
          credits: 0,
          free_credits_used: 0,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating user:', createError);
      return null;
    }
    
    user = newUser;
    console.log('Created new user:', user.id);
  }
  
  return user;
}

// Validate credits using Supabase
async function validateCredits(fingerprint, isAdmin, isInfinite, clientIp) {
  // Admin or infinite mode bypass - unlimited generation
  if (isAdmin || isInfinite) {
    return { allowed: true, isAdmin, isInfinite, remainingCredits: 999999, userId: null };
  }
  
  // Get or create user
  const user = await getOrCreateUser(fingerprint);
  if (!user) {
    return { allowed: false, error: 'Failed to access user account', code: 'USER_ERROR' };
  }
  
  // Check IP-based rate limiting
  const now = Date.now();
  let ipData = ipTracker.get(clientIp);
  
  if (ipData && now > ipData.resetTime) {
    ipData = null;
  }
  
  if (!ipData) {
    ipData = { count: 0, resetTime: now + DAILY_MS };
    ipTracker.set(clientIp, ipData);
  }
  
  const freeUsed = user.free_credits_used || 0;
  const paidCredits = user.credits || 0;
  const freeRemaining = Math.max(0, FREE_LIMIT - freeUsed);
  const totalCredits = paidCredits + freeRemaining;
  
  // Check if user has any credits
  if (totalCredits < COST_PER_IMAGE) {
    return { 
      allowed: false, 
      error: 'No credits remaining', 
      code: 'NO_CREDITS',
      remainingCredits: 0,
      userId: user.id
    };
  }
  
  // Check IP limit for free tier
  const usingFreeCredit = freeRemaining > 0;
  if (usingFreeCredit && ipData.count >= IP_FREE_LIMIT) {
    // If they have paid credits, use those instead
    if (paidCredits >= COST_PER_IMAGE) {
      // Deduct paid credit
      const { error: updateError } = await supabase
        .from('users')
        .update({ credits: paidCredits - COST_PER_IMAGE })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Error deducting credit:', updateError);
        return { allowed: false, error: 'Failed to process credit', code: 'SYSTEM_ERROR' };
      }
      
      return {
        allowed: true,
        isFreeTier: false,
        remainingCredits: paidCredits - COST_PER_IMAGE + freeRemaining,
        freeUsed: freeUsed,
        userId: user.id
      };
    }
    
    return { 
      allowed: false, 
      error: 'Daily free limit reached from this device', 
      code: 'NO_CREDITS',
      remainingCredits: 0,
      userId: user.id
    };
  }
  
  // Deduct credit (free first, then paid)
  let newFreeUsed = freeUsed;
  let newPaidCredits = paidCredits;
  
  if (freeRemaining > 0) {
    newFreeUsed += 1;
    ipData.count += 1;
  } else {
    newPaidCredits -= COST_PER_IMAGE;
  }
  
  // Update user in Supabase
  const { error: updateError } = await supabase
    .from('users')
    .update({ 
      credits: newPaidCredits,
      free_credits_used: newFreeUsed
    })
    .eq('id', user.id);
  
  if (updateError) {
    console.error('Error updating credits:', updateError);
    return { allowed: false, error: 'Failed to process credit', code: 'SYSTEM_ERROR' };
  }
  
  return {
    allowed: true,
    isFreeTier: newFreeUsed > freeUsed,
    remainingCredits: newPaidCredits + Math.max(0, FREE_LIMIT - newFreeUsed),
    freeUsed: newFreeUsed,
    userId: user.id
  };
}

export default async function handler(req, res) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'none'");

  const { method, body, query } = req;

  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!API_TOKEN) {
    return res.status(500).json({ error: 'Replicate API token not configured' });
  }

  // Parse and validate input
  let data;
  try {
    data = typeof body === 'string' ? JSON.parse(body) : body;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  
  const rawPrompt = data.prompt;
  const rawStyle = data.style;
  const rawFingerprint = data.fingerprint;
  const rawInfiniteMode = data.infiniteMode;
  const rawAdminKey = query.adminKey;
  
  // Sanitize inputs
  const prompt = sanitizeString(rawPrompt, 500);
  const style = sanitizeString(rawStyle, 50);
  const fingerprint = sanitizeString(rawFingerprint, 32);
  
  // Validate inputs
  if (!prompt || prompt.length < 3) {
    return res.status(400).json({ error: 'Prompt too short (minimum 3 characters)' });
  }
  
  if (!isValidStyle(style)) {
    return res.status(400).json({ error: 'Invalid style' });
  }
  
  if (!isValidFingerprint(fingerprint)) {
    return res.status(400).json({ error: 'Invalid fingerprint' });
  }
  
  // Validate admin key
  const isAdmin = isValidAdminKey(rawAdminKey) && rawAdminKey === ADMIN_KEY;
  const isInfinite = rawInfiniteMode === true;
  
  // Get client IP for rate limiting
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                   req.headers['x-real-ip'] || 
                   req.socket?.remoteAddress || 
                   'unknown';
  
  if (isAdmin) console.log('🔑 Admin generation requested');
  if (isInfinite) console.log('♾️ Infinite mode generation');

  // Validate credits using Supabase
  const creditCheck = await validateCredits(fingerprint, isAdmin, isInfinite, clientIp);
  
  if (!creditCheck.allowed) {
    return res.status(402).json({ 
      error: creditCheck.error, 
      code: creditCheck.code,
      remainingCredits: 0,
      freeTierExhausted: true
    });
  }

  try {
    // Build prompt
    const promptResult = buildEntouragePrompt(prompt, style);
    const fullPrompt = promptResult.prompt;
    
    console.log('Subject type:', promptResult.subjectType);
    console.log('User:', creditCheck.userId);
    if (creditCheck.isFreeTier) console.log('Free tier usage:', creditCheck.freeUsed, '/ 3');
    else if (creditCheck.isInfinite) console.log('♾️ Infinite mode - no charge');
    else if (creditCheck.isAdmin) console.log('🔑 Admin generation - no charge');
    else console.log('Paid credit usage, remaining:', creditCheck.remainingCredits);

    console.log('Generating with prompt:', fullPrompt);
    
    // Generate image
    const fluxInput = {
      prompt: fullPrompt,
      go_fast: true,
      num_outputs: 1,
      aspect_ratio: '1:1',
      output_format: 'png',
    };
    
    const fluxPred = await createPrediction(FLUX_VERSION, fluxInput);
    
    if (!fluxPred.id) {
      console.error('FLUX error:', fluxPred);
      return res.status(500).json({ error: 'Failed to create FLUX prediction', details: fluxPred });
    }
    
    const fluxResult = await waitForPrediction(fluxPred.id);
    
    if (fluxResult.status !== 'succeeded' || !fluxResult.output) {
      console.error('FLUX failed:', fluxResult);
      return res.status(500).json({ error: 'Image generation failed', details: fluxResult.error });
    }
    
    let finalImageUrl = fluxResult.output[0];
    console.log('FLUX generated:', finalImageUrl);

    // Remove background
    console.log('Removing background with rembg...');
    
    const rembgInput = { image: finalImageUrl };
    const rembgPred = await createPrediction(REMBG_VERSION, rembgInput);
    
    if (rembgPred.id) {
      const rembgResult = await waitForPrediction(rembgPred.id);
      
      if (rembgResult.status === 'succeeded' && rembgResult.output) {
        let rembgOutput = rembgResult.output;
        
        if (Array.isArray(rembgOutput)) {
          rembgOutput = rembgOutput[0];
        }
        
        if (rembgOutput && typeof rembgOutput === 'string' && rembgOutput.startsWith('http')) {
          finalImageUrl = rembgOutput;
          console.log('Transparent version:', finalImageUrl);
        }
      } else {
        console.error('rembg failed:', rembgResult.error);
      }
    } else {
      console.error('Failed to create rembg prediction:', rembgPred);
    }

    // Return the transparent image URL
    const cacheBuster = Date.now();
    const finalUrlWithCache = finalImageUrl.includes('?') 
      ? `${finalImageUrl}&cb=${cacheBuster}` 
      : `${finalImageUrl}?cb=${cacheBuster}`;
    
    console.log('Final URL:', finalUrlWithCache);
    
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.status(200).json({ 
      url: finalUrlWithCache, 
      subjectType: promptResult.subjectType,
      prompt: fullPrompt,
      isAdmin: creditCheck.isAdmin || false,
      isInfinite: creditCheck.isInfinite || false,
      isFreeTier: creditCheck.isFreeTier || false,
      remainingCredits: creditCheck.remainingCredits,
      freeTierUsed: creditCheck.freeUsed || 0
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
