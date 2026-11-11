import { supabaseAdmin } from '../../../../lib/supabase/admin';
import type { ProfileRow } from '../../../../lib/people';
import { isMember } from '../../../../lib/membership';
import { natalChart, skyNow } from '../../../../lib/sky';
import { buildDigest } from '../../../../lib/digest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.astrologybird.com';
const FROM = process.env.DIGEST_FROM || 'AstrologyBird <info@astrologybird.com>';
const BATCH = 5;

/** Daily digest job. Vercel Cron calls it with "Authorization: Bearer $CRON_SECRET". */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('unauthorized', { status: 401 });
  const admin = supabaseAdmin();
  if (!admin || !process.env.RESEND_API_KEY) return Response.json({ error: 'missing SUPABASE_SECRET_KEY or RESEND_API_KEY' }, { status: 503 });

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: profiles }, { data: sent }] = await Promise.all([
    admin.from('profiles').select('*').eq('digest_opt_in', true),
    admin.from('digest_sends').select('user_id').eq('sent_on', today),
  ]);
  const done = new Set((sent ?? []).map((r) => r.user_id as string));
  const todo = ((profiles ?? []) as ProfileRow[]).filter((p) => !done.has(p.id));
  if (!todo.length) return Response.json({ sent: 0 });

  const emails = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    data.users.forEach((u) => u.email && emails.set(u.id, u.email));
    if (data.users.length < 1000) break;
  }

  const sky = await skyNow();
  let ok = 0; const failed: string[] = [];
  for (let i = 0; i < todo.length; i += BATCH) {
    await Promise.all(todo.slice(i, i + BATCH).map(async (profile) => {
      const to = emails.get(profile.id);
      if (!to) return;
      try {
        const member = await isMember(admin, profile.id);
        const natal = member ? await natalChart(profile) : null;
        const digest = await buildDigest({ profile, userId: profile.id, member, natal, sky, appUrl: APP_URL });
        const manage = `${profile.locale === 'nl' ? `${APP_URL}/nl` : APP_URL}/account`;
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM, to, subject: digest.subject, html: digest.html, text: digest.text, headers: { 'List-Unsubscribe': `<${manage}>` } }),
        });
        if (!res.ok) throw new Error(`resend ${res.status} ${await res.text()}`);
        await admin.from('digest_sends').insert({ user_id: profile.id, sent_on: today });
        ok++;
      } catch (err) {
        console.error('digest failed for', profile.id, err);
        failed.push(profile.id);
      }
    }));
  }
  return Response.json({ sent: ok, failed: failed.length, remaining: Math.max(0, todo.length - ok - failed.length) });
}
