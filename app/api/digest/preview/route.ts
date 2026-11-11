import { supabaseServer } from '../../../../lib/supabase/server';
import type { ProfileRow } from '../../../../lib/people';
import { isMember } from '../../../../lib/membership';
import { natalChart, skyNow } from '../../../../lib/sky';
import { buildDigest } from '../../../../lib/digest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Shows the signed-in person today's digest in the browser. */
export async function GET(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response('Sign in first.', { status: 401 });
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single<ProfileRow>();
  if (!profile) return new Response('No profile.', { status: 404 });
  const member = await isMember(sb, user.id);
  const [natal, sky] = await Promise.all([member ? natalChart(profile) : null, skyNow()]);
  const digest = await buildDigest({ profile, userId: user.id, member, natal, sky, appUrl: new URL(req.url).origin });
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${digest.subject}</title><body style="margin:0">${digest.html}</body>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
