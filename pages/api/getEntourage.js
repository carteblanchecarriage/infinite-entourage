const { buildEntouragePrompt } = require('../../lib/promptBuilder');

const FLUX_VERSION = '6e4a938f85952bdabcc15aa329178c4d681c52bf25a0342403287dc26944661d';
const REMBG_VERSION = 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003';
const API_TOKEN = process.env.REPLICATE_API_TOKEN;
const ADMIN_KEY = process.env.ADMIN_GENERATION_KEY;

// Simple in-memory store for free tier tracking (resets on deploy, but that's ok)
// For production, use Redis or database
const freeTierTracker = new Map();
const COST_PER_IMAGE = 1;

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

// Validate credits and return result
function validateCredits(fingerprint, clientCredits, isAdmin) {
  // Admin bypass - unlimited generation
  if (isAdmin) {
    return { allowed: true, isAdmin: true, remainingCredits: 999999 };
  }
  
  // Check free tier usage server-side
  const freeUsed = freeTierTracker.get(fingerprint) || 0;
  const FREE_LIMIT = 3;
  
  // If they have free credits remaining
  if (freeUsed < FREE_LIMIT) {
    return { 
      allowed: true, 
      isFreeTier: true, 
      remainingCredits: FREE_LIMIT - freeUsed - 1,
      freeUsed: freeUsed + 1
    };
  }
  
  // Check paid credits
  if (clientCredits && clientCredits >= COST_PER_IMAGE) {
    return { 
      allowed: true, 
      isFreeTier: false, 
      remainingCredits: clientCredits - COST_PER_IMAGE 
    };
  }
  
  // No credits available
  return { 
    allowed: false, 
    error: 'No credits remaining', 
    code: 'NO_CREDITS',
    remainingCredits: 0
  };
}

export default async function handler(req, res) {
  const { method, body, query } = req;

  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!API_TOKEN) {
    return res.status(500).json({ error: 'Replicate API token not configured' });
  }

  const data = typeof body === 'string' ? JSON.parse(body) : body;
  const { prompt, style, fingerprint, credits: clientCredits } = data;
  
  if (!prompt || prompt.length < 3) {
    return res.status(400).json({ error: 'Prompt too short' });
  }
  
  // Check for admin key in query params (secret unlimited URL)
  // Usage: POST /api/getEntourage?adminKey=YOUR_SECRET_KEY
  const isAdmin = query.adminKey && query.adminKey === ADMIN_KEY;
  
  if (isAdmin) {
    console.log('🔑 Admin generation requested');
  }

  // Validate credits
  const creditCheck = validateCredits(fingerprint, clientCredits, isAdmin);
  
  if (!creditCheck.allowed) {
    return res.status(402).json({ 
      error: creditCheck.error, 
      code: creditCheck.code,
      remainingCredits: 0,
      freeTierExhausted: true
    });
  }

  try {
    // Use the advanced prompt builder
    const promptResult = buildEntouragePrompt(prompt, style);
    const fullPrompt = promptResult.prompt;
    
    console.log('Subject type:', promptResult.subjectType);
    console.log('Diversity injected:', promptResult.diversityInjected);
    console.log('Style:', promptResult.style);
    if (creditCheck.isFreeTier) {
      console.log('Free tier usage:', creditCheck.freeUsed, '/ 3');
    } else if (creditCheck.isAdmin) {
      console.log('Admin generation - no charge');
    } else {
      console.log('Paid credit usage, remaining:', creditCheck.remainingCredits);
    }

    console.log('Generating with prompt:', fullPrompt);
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

    // Always remove background for clean entourage output
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

    // Update free tier tracking if applicable
    if (creditCheck.isFreeTier && fingerprint) {
      freeTierTracker.set(fingerprint, creditCheck.freeUsed);
    }
    
    // Return the transparent image URL with cache-busting
    const cacheBuster = Date.now();
    const finalUrlWithCache = finalImageUrl.includes('?') 
      ? `${finalImageUrl}&cb=${cacheBuster}` 
      : `${finalImageUrl}?cb=${cacheBuster}`;
    
    console.log('Final URL:', finalUrlWithCache);
    
    // Disable caching on this response
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.status(200).json({ 
      url: finalUrlWithCache, 
      subjectType: promptResult.subjectType,
      prompt: fullPrompt,
      isAdmin: creditCheck.isAdmin || false,
      isFreeTier: creditCheck.isFreeTier || false,
      remainingCredits: creditCheck.remainingCredits,
      freeTierUsed: creditCheck.freeUsed || 0
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
