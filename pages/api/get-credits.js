import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { fingerprint } = req.query;
  
  if (!fingerprint) {
    return res.status(400).json({ error: 'No fingerprint provided' });
  }

  try {
    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('credits, free_credits_used')
      .eq('fingerprint', fingerprint)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user:', error);
      return res.status(500).json({ error: 'Failed to fetch credits' });
    }
    
    if (!user) {
      // No user yet - they have 3 free credits
      return res.status(200).json({
        credits: 0,
        freeUsed: 0,
        freeRemaining: 3,
        total: 3
      });
    }
    
    const freeRemaining = Math.max(0, 3 - (user.free_credits_used || 0));
    
    res.status(200).json({
      credits: user.credits || 0,
      freeUsed: user.free_credits_used || 0,
      freeRemaining,
      total: (user.credits || 0) + freeRemaining
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
