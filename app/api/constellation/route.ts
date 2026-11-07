import { supabaseServer } from '../../../lib/supabase/server';
import type { PersonRow, ProfileRow } from '../../../lib/people';
import { isMember } from '../../../lib/membership';
import { loadSky } from '../../../lib/constellation-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const json = (body: unknown, status = 200) => Response.json(body, { status });

/** The signed-in user's constellation: their own chart plus the people they saved. */
export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'signin' }, 401);
  const [{ data: profile }, { data: people }, member] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).maybeSingle<ProfileRow>(),
    sb.from('people').select('*').order('created_at'),
    isMember(sb, user.id),
  ]);
  if (!profile?.birth_date || profile.lat === null) return json({ error: 'profile' }, 400);
  try {
    const sky = await loadSky(profile, (people as PersonRow[] | null) ?? [], member, profile.locale === 'nl' ? 'Jij' : 'You');
    return sky ? json(sky) : json({ error: 'profile' }, 400);
  } catch {
    return json({ error: 'engine' }, 502);
  }
}
