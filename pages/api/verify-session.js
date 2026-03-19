import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SERVICE_ROLE
);

export default async function handler(req, res) {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'No session ID provided' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed', status: session.payment_status });
    }

    // Get credits from metadata or price ID lookup
    let credits = parseInt(session.metadata?.credits || '0', 10);
    if (!credits) {
      const lineItems = await stripe.checkout.sessions.listLineItems(session_id);
      const priceIdToCredits = {
        [process.env.STRIPE_PRICE_STARTER]: 20,
        [process.env.STRIPE_PRICE_STANDARD]: 75,
        [process.env.STRIPE_PRICE_PRO]: 150,
      };
      for (const item of lineItems.data) {
        credits += (priceIdToCredits[item.price?.id] || 0) * item.quantity;
      }
    }

    if (credits <= 0) return res.status(400).json({ error: 'No credits found in purchase' });

    // Check for duplicate processing
    const { data: existing } = await supabase
      .from('purchases')
      .select('id, amount')
      .eq('stripe_session_id', session_id)
      .single();

    if (existing) {
      return res.status(200).json({ success: true, credits: existing.amount, alreadyProcessed: true });
    }

    // Find or create user row
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Failed to access user account' });
    }

    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{ auth_user_id: authUser.id, credits: 0, free_credits_used: 0 }])
        .select()
        .single();
      if (createError) return res.status(500).json({ error: 'Failed to create user account' });
      user = newUser;
    }

    // Add credits
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: (user.credits || 0) + credits })
      .eq('id', user.id);

    if (updateError) return res.status(500).json({ error: 'Failed to add credits' });

    // Record purchase
    await supabase.from('purchases').insert([{
      user_id: user.id,
      stripe_session_id: session_id,
      stripe_payment_intent_id: session.payment_intent,
      amount: credits,
      price_paid: session.amount_total,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }]);

    res.status(200).json({ success: true, credits, userId: user.id });
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ error: error.message });
  }
}
