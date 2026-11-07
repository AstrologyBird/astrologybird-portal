import { supabaseServer } from '../../../../lib/supabase/server';
import { cardById } from '../../../../lib/learn';

export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => Response.json(body, { status });

/** Save a private shadow answer and turn that card to its Black Light side. */
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'signin' }, 401);
  const body = await req.json().catch(() => null) as { card?: unknown; answer?: unknown; lesson?: unknown } | null;
  const card = typeof body?.card === 'string' && cardById(body.card) ? body.card : null;
  const answer = typeof body?.answer === 'string' ? body.answer.trim() : '';
  const lesson = typeof body?.lesson === 'string' ? body.lesson.slice(0, 40) : null;
  if (!card || !answer || answer.length > 4000) return json({ error: 'input' }, 400);

  // The front must be in the deck before its Black Light side can open.
  const { data: front } = await sb.from('card_unlocks').select('card_id').eq('card_id', card).eq('side', 'front').maybeSingle();
  if (!front) return json({ error: 'front' }, 409);

  const { error: e1 } = await sb.from('shadow_answers').insert({ owner_id: user.id, card_id: card, lesson_id: lesson, answer });
  if (e1) return json({ error: 'save' }, 500);
  const { error: e2 } = await sb.from('card_unlocks').upsert({ owner_id: user.id, card_id: card, side: 'blacklight', source: 'lesson' }, { onConflict: 'owner_id,card_id,side', ignoreDuplicates: true });
  if (e2) return json({ error: 'save' }, 500);
  return json({ ok: true });
}
