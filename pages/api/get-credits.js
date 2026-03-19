import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SERVICE_ROLE
);

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('credits, free_credits_used')
      .eq('auth_user_id', authUser.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Failed to fetch credits' });
    }

    if (!user) {
      return res.status(200).json({ credits: 0, freeUsed: 0, freeRemaining: 3, total: 3 });
    }

    const freeRemaining = Math.max(0, 3 - (user.free_credits_used || 0));
    res.status(200).json({
      credits: user.credits || 0,
      freeUsed: user.free_credits_used || 0,
      freeRemaining,
      total: (user.credits || 0) + freeRemaining,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
