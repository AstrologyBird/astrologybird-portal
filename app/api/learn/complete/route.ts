import { supabaseServer } from '../../../../lib/supabase/server';
import type { PersonRow, ProfileRow } from '../../../../lib/people';
import { getDictionary } from '../../../../lib/i18n';
import { isMember } from '../../../../lib/membership';
import { FREE_LEVELS, lessonDef } from '../../../../lib/learn';
import { lessonFor } from '../../../../lib/learn-server';

export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => Response.json(body, { status });

/** Finish a lesson: record it and add its cards (front side) to the user's deck. */
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'signin' }, 401);
  const body = await req.json().catch(() => null) as { lesson?: unknown } | null;
  const id = typeof body?.lesson === 'string' ? body.lesson : '';
  const def = lessonDef(id);
  if (!def) return json({ error: 'lesson' }, 400);

  const [{ data: profile }, { data: people }, member] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).maybeSingle<ProfileRow>(),
    sb.from('people').select('*').order('created_at'),
    isMember(sb, user.id),
  ]);
  if (def.level > FREE_LEVELS && !member) return json({ error: 'member' }, 402);
  if (!profile?.birth_date) return json({ error: 'profile' }, 400);

  let lesson;
  try {
    lesson = await lessonFor(id, profile.locale, getDictionary(profile.locale), profile, (people as PersonRow[] | null) ?? [], member);
  } catch {
    return json({ error: 'engine' }, 502);
  }
  if (!lesson) return json({ error: 'profile' }, 400);

  const { error: e1 } = await sb.from('lesson_progress').upsert({ owner_id: user.id, lesson_id: id }, { onConflict: 'owner_id,lesson_id', ignoreDuplicates: true });
  const rows = lesson.cards.map((card_id) => ({ owner_id: user.id, card_id, side: 'front', source: 'lesson' }));
  const { error: e2 } = rows.length
    ? await sb.from('card_unlocks').upsert(rows, { onConflict: 'owner_id,card_id,side', ignoreDuplicates: true })
    : { error: null };
  if (e1 || e2) return json({ error: 'save' }, 500);
  return json({ ok: true, cards: lesson.cards });
}
