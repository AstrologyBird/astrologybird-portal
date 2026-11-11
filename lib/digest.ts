// Daily digest e-mail. Free: Moon, card of the day and its question.
// Members also get their personal transits and a short note from the Bird.
import Anthropic from '@anthropic-ai/sdk';
import type { Chart } from './chart-types';
import { getDictionary, type Locale } from './i18n';
import type { ProfileRow } from './people';
import { BIRD_PERSONA, skyContext } from './bird-prompt';
import { cardOfTheDay, describeChart, describeTransits, moonPhase, personalTransits, type Transit } from './sky';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface Digest { subject: string; html: string; text: string }

async function birdNote(profile: ProfileRow, natal: Chart, sky: Chart, transits: Transit[], lang: Locale, userId: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const card = cardOfTheDay(userId);
  try {
    const res = await new Anthropic().beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: BIRD_PERSONA, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: skyContext({
          name: profile.display_name, natal: describeChart(natal), transits: describeTransits(transits),
          moonPhase: moonPhase(sky).key, today: new Date().toISOString().slice(0, 10), card: card.en,
        }) },
      ],
      messages: [{
        role: 'user',
        content: `Write my morning note for today in ${lang === 'nl' ? 'Dutch' : 'English'}: about 90 words, two short paragraphs, tied to my strongest transit today and my card. No greeting, no sign-off, no question at the end (the e-mail already has one).`,
      }],
    });
    if (res.stop_reason === 'refusal') return null;
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    return text || null;
  } catch (err) {
    console.error('digest note failed', err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
    return null;
  }
}

export async function buildDigest(opts: {
  profile: ProfileRow; userId: string; member: boolean; natal: Chart | null; sky: Chart; appUrl: string;
}): Promise<Digest> {
  const { profile, userId, member, natal, sky, appUrl } = opts;
  const lang: Locale = profile.locale === 'nl' ? 'nl' : 'en';
  const t = getDictionary(lang);
  const d = t.digest;
  const card = cardOfTheDay(userId)[lang];
  const moon = sky.points.find((p) => p.key === 'moon')!;
  const phase = moonPhase(sky).key as keyof typeof d.phases;
  const date = new Intl.DateTimeFormat(lang === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' }).format(new Date());
  const base = lang === 'nl' ? `${appUrl}/nl` : appUrl;

  const transits = member && natal ? personalTransits(sky, natal, 4) : [];
  const note = member && natal ? await birdNote(profile, natal, sky, personalTransits(sky, natal, 8), lang, userId) : null;
  const transitLines = transits.map((tr) => `${t.points[tr.transiting]} ${t.aspects[tr.type]} ${lang === 'nl' ? 'jouw' : 'your'} ${t.points[tr.natal]}`);

  const name = profile.display_name ? `, ${profile.display_name}` : '';
  const subject = d.subject.replace('{date}', date).replace('{card}', card.name);
  const moonLine = d.moon.replace('{phase}', d.phases[phase]).replace('{sign}', t.signs[moon.sign]);

  const p = (s: string, style = '') => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#D9D3E6;${style}">${s}</p>`;
  const h = (s: string) => `<p style="margin:28px 0 10px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#F0D38A;">${s}</p>`;

  const html = `<div style="background:#0E1630;padding:32px 12px;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:520px;margin:0 auto;background:#1A2547;border:1px solid #2c3866;border-radius:16px;padding:32px 28px;color:#F6F0E4;">
<p style="margin:0 0 20px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#F0D38A;">&#10022; AstrologyBird · ${esc(date)}</p>
<h1 style="margin:0 0 12px;font-size:24px;font-weight:normal;color:#F6F0E4;">${esc(d.hello.replace('{name}', name))}</h1>
${p(esc(moonLine))}
${h(esc(d.cardTitle))}
<p style="margin:0 0 6px;font-size:21px;color:#F6F0E4;">${esc(card.name)} · <em style="color:#F0D38A;">${esc(card.title)}</em></p>
${p(esc(card.message))}
${member ? p(`<span style="color:#F0D38A;">&#10022;</span> ${esc(card.blackLight)}`, 'font-style:italic;') : ''}
${transitLines.length ? h(esc(d.transitsTitle)) + p(transitLines.map(esc).join('<br>')) : ''}
${note ? h(esc(d.birdNote)) + note.split(/\n\s*\n/).map((para) => p(esc(para))).join('') : ''}
${h(esc(d.question))}
<p style="margin:0 0 24px;font-size:19px;line-height:1.5;color:#F6F0E4;font-style:italic;">${esc(card.question)}</p>
<p style="margin:0 0 8px;"><a href="${base}/bird" style="display:inline-block;background:#F0D38A;color:#0E1630;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;font-size:15px;padding:13px 26px;border-radius:999px;">${esc(d.ask)}</a></p>
${member ? '' : p(esc(d.memberTeaser), 'margin-top:20px;font-size:14px;color:#B8B4C8;')}
</div>
<p style="max-width:520px;margin:18px auto 0;text-align:center;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#8A8FAD;">${esc(d.footer)}<br><a href="${base}/account" style="color:#B8B4C8;">${esc(d.manage)}</a></p>
</div>`;

  const text = [
    `${d.hello.replace('{name}', name)}`, moonLine, '', `${d.cardTitle}: ${card.name} · ${card.title}`, card.message,
    ...(member ? [card.blackLight] : []),
    ...(transitLines.length ? ['', `${d.transitsTitle}:`, ...transitLines] : []),
    ...(note ? ['', `${d.birdNote}:`, note] : []),
    '', `${d.question}: ${card.question}`, '', `${d.ask}: ${base}/bird`, '', `${d.manage}: ${base}/account`,
  ].join('\n');

  return { subject, html, text };
}
