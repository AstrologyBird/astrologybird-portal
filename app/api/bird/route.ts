import Anthropic from '@anthropic-ai/sdk';
import { supabaseServer } from '../../../lib/supabase/server';
import type { ProfileRow } from '../../../lib/people';
import { FREE_BIRD_QUESTIONS, isMember, questionsUsedThisMonth } from '../../../lib/membership';
import { cardOfTheDay, describeChart, describeTransits, moonPhase, natalChart, personalTransits, skyNow } from '../../../lib/sky';
import { BIRD_PERSONA, skyContext } from '../../../lib/bird-prompt';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_QUESTION = 1000;
const HISTORY = 20;

const json = (body: unknown, status = 200) => Response.json(body, { status });

async function context() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single<ProfileRow>();
  const [member, used] = await Promise.all([isMember(sb, user.id), questionsUsedThisMonth(sb, user.id)]);
  return { sb, user, profile, member, used, remaining: member ? null : Math.max(0, FREE_BIRD_QUESTIONS - used) };
}

/** Conversation so far plus the person's quota. */
export async function GET() {
  const ctx = await context();
  if (!ctx) return json({ error: 'signin' }, 401);
  const { data } = await ctx.sb.from('bird_messages').select('id,role,content,created_at')
    .eq('owner_id', ctx.user.id).order('created_at', { ascending: false }).limit(50);
  return json({
    messages: (data ?? []).reverse(), member: ctx.member, remaining: ctx.remaining, limit: FREE_BIRD_QUESTIONS,
    hasProfile: Boolean(ctx.profile?.birth_date && ctx.profile.lat !== null),
    card: ctx.profile ? cardOfTheDay(ctx.user.id) : null,
  });
}

/** Ask a question; the answer streams back as plain text. */
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'unavailable' }, 503);
  const ctx = await context();
  if (!ctx) return json({ error: 'signin' }, 401);
  const { sb, user, profile, member, remaining } = ctx;

  const body = await req.json().catch(() => null) as { message?: unknown } | null;
  const question = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!question || question.length > MAX_QUESTION) return json({ error: 'length' }, 400);
  if (!profile) return json({ error: 'profile' }, 400);
  if (!member && remaining === 0) return json({ error: 'quota' }, 402);

  const natalP = natalChart(profile);
  if (!natalP) return json({ error: 'profile' }, 400);

  const [natal, sky, history] = await Promise.all([
    natalP, skyNow(),
    sb.from('bird_messages').select('role,content').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(HISTORY),
  ]);

  const { error: insertError } = await sb.from('bird_messages').insert({ owner_id: user.id, role: 'user', content: question });
  if (insertError) return json({ error: 'save' }, 500);

  const card = cardOfTheDay(user.id);
  const lang = profile.locale === 'nl' ? 'nl' : 'en';
  const system = skyContext({
    name: profile.display_name, natal: describeChart(natal), transits: describeTransits(personalTransits(sky, natal, 8)),
    moonPhase: moonPhase(sky).key, today: new Date().toISOString().slice(0, 10),
    card: { ...card.en, name: card.en.name, title: card.en.title },
  }) + (lang === 'nl' ? '\n\nTheir account language is Dutch.' : '');

  // Past turns, oldest first; the API needs strictly alternating roles starting with the user.
  const past: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of (history.data ?? []).reverse()) {
    const role = m.role as 'user' | 'assistant';
    if (!past.length && role !== 'user') continue;
    const last = past[past.length - 1];
    if (last && last.role === role) last.content = `${last.content}\n\n${m.content}`;
    else past.push({ role, content: m.content });
  }
  if (past.length && past[past.length - 1].role === 'user') past.pop();

  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: 'claude-sonnet-5-5',
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: [
      { type: 'text', text: BIRD_PERSONA, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: system },
    ],
    messages: [...past, { role: 'user', content: question }],
  });

  const encoder = new TextEncoder();
  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = '';
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            answer += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') {
          answer = lang === 'nl'
            ? 'Daar kan ik je helaas niet mee helpen. Stel je vraag gerust op een andere manier.'
            : "That's one I can't help with. Feel free to ask it another way.";
          controller.enqueue(encoder.encode(`\n\n${answer}`));
        }
        if (answer.trim()) await sb.from('bird_messages').insert({ owner_id: user.id, role: 'assistant', content: answer.slice(0, 8000) });
      } catch (err) {
        console.error('bird stream failed', err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
        controller.enqueue(encoder.encode(lang === 'nl'
          ? '\n\n(De verbinding met de sterren viel even weg. Probeer het zo nog eens.)'
          : '\n\n(The line to the stars dropped for a moment. Please try again.)'));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body$, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
