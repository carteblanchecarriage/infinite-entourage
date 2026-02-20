import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Helper to get/set user credits (localStorage fallback for demo)
export async function getCredits(userId) {
  if (supabase) {
    const { data } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();
    return data?.credits || 0;
  }
  // Fallback: use localStorage on client
  if (typeof window !== 'undefined') {
    return parseInt(localStorage.getItem('credits') || '5', 10);
  }
  return 5;
}

export async function deductCredit(userId) {
  if (supabase) {
    const { data } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();
    
    if (data && data.credits > 0) {
      await supabase
        .from('users')
        .update({ credits: data.credits - 1 })
        .eq('id', userId);
      return true;
    }
    return false;
  }
  // Fallback
  if (typeof window !== 'undefined') {
    const current = parseInt(localStorage.getItem('credits') || '5', 10);
    if (current > 0) {
      localStorage.setItem('credits', (current - 1).toString());
      return true;
    }
  }
  return false;
}

export async function addCredits(userId, amount) {
  if (supabase) {
    const { data } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();
    
    const newCredits = (data?.credits || 0) + amount;
    await supabase
      .from('users')
      .upsert({ id: userId, credits: newCredits });
  }
  // Fallback
  if (typeof window !== 'undefined') {
    const current = parseInt(localStorage.getItem('credits') || '5', 10);
    localStorage.setItem('credits', (current + amount).toString());
  }
}
