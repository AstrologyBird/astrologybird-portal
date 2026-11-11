'use client';
import { supabaseBrowser } from './supabase/browser';
import { inputFromPerson, inputFromProfile, type BirthInput, type PersonRow, type ProfileRow } from './people';

/** Load birth data for "me" (the profile) or a saved person id; null when not signed in or not found. */
export async function loadSaved(ref: string): Promise<BirthInput | null> {
  const sb = supabaseBrowser();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  if (ref === 'me') {
    const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    return data ? inputFromProfile(data as ProfileRow) : null;
  }
  if (!/^[0-9a-f-]{36}$/i.test(ref)) return null;
  const { data } = await sb.from('people').select('*').eq('id', ref).maybeSingle();
  return data ? inputFromPerson(data as PersonRow) : null;
}

export async function listSaved(): Promise<{ me: BirthInput | null; people: PersonRow[] } | null> {
  const sb = supabaseBrowser();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const [{ data: profile }, { data: people }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
    sb.from('people').select('*').order('created_at'),
  ]);
  return { me: profile ? inputFromProfile(profile as ProfileRow) : null, people: (people as PersonRow[]) ?? [] };
}
