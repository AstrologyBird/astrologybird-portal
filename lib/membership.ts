import type { SupabaseClient } from '@supabase/supabase-js';

/** Free accounts get this many questions to the Bird per calendar month. */
export const FREE_BIRD_QUESTIONS = 3;

export async function isMember(sb: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await sb.from('memberships').select('status,current_period_end').eq('user_id', userId).maybeSingle();
  if (!data || !['active', 'trialing'].includes(data.status)) return false;
  return !data.current_period_end || new Date(data.current_period_end) > new Date();
}

export async function questionsUsedThisMonth(sb: SupabaseClient, userId: string): Promise<number> {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count } = await sb.from('bird_messages').select('id', { count: 'exact', head: true })
    .eq('owner_id', userId).eq('role', 'user').gte('created_at', start);
  return count ?? 0;
}
