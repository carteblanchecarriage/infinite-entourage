import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to get or create user from fingerprint
export async function getOrCreateUser(fingerprint) {
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
  }
  
  return user;
}

// Helper to get user by email (for auth)
export async function getUserByEmail(email) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user by email:', error);
    return null;
  }
  
  return user;
}

// Helper to update user credits
export async function updateUserCredits(userId, credits, freeCreditsUsed = null) {
  const updates = { credits };
  if (freeCreditsUsed !== null) {
    updates.free_credits_used = freeCreditsUsed;
  }
  
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating credits:', error);
    return null;
  }
  
  return data;
}

// Helper to add credits (for purchases)
export async function addCredits(userId, amount) {
  // Get current credits
  const { data: user, error } = await supabase
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching user credits:', error);
    return null;
  }
  
  const newCredits = (user?.credits || 0) + amount;
  
  return updateUserCredits(userId, newCredits);
}

// Helper to use a credit
export async function useCredit(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('credits, free_credits_used')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching user:', error);
    return { success: false, error: 'User not found' };
  }
  
  const totalCredits = (user?.credits || 0) + Math.max(0, 3 - (user?.free_credits_used || 0));
  
  if (totalCredits < 1) {
    return { success: false, error: 'No credits available' };
  }
  
  // Use free credits first, then paid credits
  let newFreeUsed = user?.free_credits_used || 0;
  let newCredits = user?.credits || 0;
  
  if (newFreeUsed < 3) {
    newFreeUsed += 1;
  } else {
    newCredits -= 1;
  }
  
  const { data, error: updateError } = await supabase
    .from('users')
    .update({ 
      credits: newCredits,
      free_credits_used: newFreeUsed
    })
    .eq('id', userId)
    .select()
    .single();
  
  if (updateError) {
    console.error('Error using credit:', updateError);
    return { success: false, error: 'Failed to use credit' };
  }
  
  return { 
    success: true, 
    remainingCredits: newCredits,
    freeUsed: newFreeUsed,
    totalRemaining: newCredits + Math.max(0, 3 - newFreeUsed)
  };
}

// Helper to get remaining credits
export async function getRemainingCredits(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('credits, free_credits_used')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching credits:', error);
    return { credits: 0, freeUsed: 0, total: 0 };
  }
  
  const freeRemaining = Math.max(0, 3 - (user?.free_credits_used || 0));
  const paidCredits = user?.credits || 0;
  
  return {
    credits: paidCredits,
    freeUsed: user?.free_credits_used || 0,
    freeRemaining,
    total: paidCredits + freeRemaining
  };
}
