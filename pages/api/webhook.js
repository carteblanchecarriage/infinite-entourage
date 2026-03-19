import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SERVICE_ROLE
);

const PRICE_CREDITS = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER]: 20,
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD]: 75,
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO]: 150,
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const rawBody = await getRawBody(req);
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const auth_user_id = session.metadata?.auth_user_id;

    let credits = parseInt(session.metadata?.credits || '0', 10);
    if (!credits) {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      for (const item of lineItems.data) {
        credits += (PRICE_CREDITS[item.price?.id] || 0) * item.quantity;
      }
    }

    if (!credits || !auth_user_id) {
      console.error('Missing credits or auth_user_id in webhook metadata');
      return res.status(200).json({ received: true });
    }

    // Check for duplicate processing
    const { data: existing } = await supabase
      .from('purchases')
      .select('id')
      .eq('stripe_session_id', session.id)
      .single();

    if (existing) {
      console.log('Session already processed:', session.id);
      return res.status(200).json({ received: true });
    }

    // Find or create user
    let { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', auth_user_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user:', fetchError);
      return res.status(500).end();
    }

    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{ auth_user_id, credits: 0, free_credits_used: 0 }])
        .select()
        .single();
      if (createError) { console.error('Error creating user:', createError); return res.status(500).end(); }
      user = newUser;
    }

    // Add credits
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: (user.credits || 0) + credits })
      .eq('id', user.id);

    if (updateError) { console.error('Error updating credits:', updateError); return res.status(500).end(); }

    // Record purchase
    await supabase.from('purchases').insert([{
      user_id: user.id,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      amount: credits,
      price_paid: session.amount_total,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }]);

    console.log(`Webhook: added ${credits} credits to auth user ${auth_user_id}`);
  }

  res.status(200).json({ received: true });
}

export const config = {
  api: { bodyParser: false },
};
