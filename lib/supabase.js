import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getOrCreateUser(fingerprint) {
  let { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('fingerprint', fingerprint)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user:', error);
    return null;
  }
  
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
      return null;
    }
    
    user = newUser;
  }
  
  return user;
}

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

export async function addCredits(userId, amount) {
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
