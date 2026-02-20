import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { session_id, fingerprint } = req.query;
  
  if (!session_id) {
    return res.status(400).json({ error: 'No session ID provided' });
  }
  
  if (!fingerprint) {
    return res.status(400).json({ error: 'No fingerprint provided' });
  }

  try {
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        error: 'Payment not completed',
        status: session.payment_status 
      });
    }
    
    // Get credits amount from metadata or line items
    let credits = parseInt(session.metadata?.credits || '0', 10);
    
    // If no metadata, calculate from line items
    if (!credits && session.line_items) {
      const lineItems = await stripe.checkout.sessions.listLineItems(session_id);
      // Map price IDs to credit amounts
      const priceIdToCredits = {
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_40]: 40,
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_100]: 100,
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_250]: 250,
      };
      
      for (const item of lineItems.data) {
        const priceId = item.price?.id;
        if (priceIdToCredits[priceId]) {
          credits += priceIdToCredits[priceId] * item.quantity;
        }
      }
    }
    
    if (credits <= 0) {
      return res.status(400).json({ error: 'No credits found in purchase' });
    }
    
    // Check if this session was already processed
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('*')
      .eq('stripe_session_id', session_id)
      .single();
    
    if (existingPurchase) {
      // Already processed, just return success
      return res.status(200).json({ 
        success: true, 
        credits: existingPurchase.amount,
        alreadyProcessed: true 
      });
    }
    
    // Find or create user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('fingerprint', fingerprint)
      .single();
    
    if (userError && userError.code !== 'PGRST116') {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Failed to access user account' });
    }
    
    // Create user if not exists
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{ 
          fingerprint: fingerprint,
          credits: 0,
          free_credits_used: 0
        }])
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating user:', createError);
        return res.status(500).json({ error: 'Failed to create user account' });
      }
      user = newUser;
    }
    
    // Add credits to user
    const newCredits = (user.credits || 0) + credits;
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('Error adding credits:', updateError);
      return res.status(500).json({ error: 'Failed to add credits' });
    }
    
    // Record the purchase
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert([{
        user_id: user.id,
        stripe_session_id: session_id,
        stripe_payment_intent_id: session.payment_intent,
        amount: credits,
        price_paid: session.amount_total,
        status: 'completed',
        completed_at: new Date().toISOString()
      }]);
    
    if (purchaseError) {
      console.error('Error recording purchase:', purchaseError);
      // Don't fail - credits were already added
    }
    
    res.status(200).json({ 
      success: true, 
      credits: credits,
      userId: user.id 
    });
    
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ error: error.message });
  }
}
