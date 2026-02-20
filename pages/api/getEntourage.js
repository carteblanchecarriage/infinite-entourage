const { buildEntouragePrompt } = require('../../lib/promptBuilder');

const FLUX_VERSION = '6e4a938f85952bdabcc15aa329178c4d681c52bf25a0342403287dc26944661d';
const REMBG_VERSION = 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003';
const API_TOKEN = process.env.REPLICATE_API_TOKEN;

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

export default async function handler(req, res) {
  const { method, body } = req;

  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!API_TOKEN) {
    return res.status(500).json({ error: 'Replicate API token not configured' });
  }

  const { prompt, style, userId, includeTransparent } = typeof body === 'string' ? JSON.parse(body) : body;
  
  if (!prompt || prompt.length < 3) {
    return res.status(400).json({ error: 'Prompt too short' });
  }

  // Check for demo mode (no credits required)
  const isDemo = !userId || userId === 'demo';
  
  if (!isDemo) {
    // TODO: Check user credits from Supabase
    // For now, allow generation if user has credits (implement with real DB)
    const hasCredits = true; // Replace with: await checkCredits(userId)
    
    if (!hasCredits) {
      return res.status(402).json({ error: 'Insufficient credits', code: 'NO_CREDITS' });
    }
  }

  try {
    // Use the advanced prompt builder
    const promptResult = buildEntouragePrompt(prompt, style);
    const fullPrompt = promptResult.prompt;
    
    console.log('Subject type:', promptResult.subjectType);
    console.log('Diversity injected:', promptResult.diversityInjected);
    console.log('Style:', promptResult.style);

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
        finalImageUrl = rembgResult.output[0];
        console.log('Transparent version:', finalImageUrl);
      } else {
        console.error('rembg failed, returning original');
      }
    }

    // Deduct credit for generation
    if (!isDemo) {
      // TODO: Deduct credit
      // await deductCredit(userId);
    }
    
    // Return the transparent image URL
    console.log('Final transparent URL:', finalImageUrl);
    res.status(200).json({ 
      url: finalImageUrl, 
      subjectType: promptResult.subjectType,
      prompt: fullPrompt 
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
