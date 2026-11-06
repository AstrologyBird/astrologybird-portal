// Server-side helpers shared by Ask the Bird and the daily digest:
// a person's natal chart, today's sky, personal transits and the card of the day.
import type { Chart, PointKey, Position } from './chart-types';
import type { ProfileRow } from './people';
import deck from './oracle-deck.json';

const ENGINE = (process.env.CHART_ENGINE_URL || (process.env.NODE_ENV === 'production' ? 'https://astrologybird-chart-engine-2ofw.vercel.app' : 'http://localhost:8787')).replace(/\/$/, '');

export type Card = (typeof deck)[number];

async function chart(input: Record<string, unknown>): Promise<Chart> {
  const res = await fetch(`${ENGINE}/api/chart`, {
    method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`engine ${res.status}`);
  return res.json();
}

export function natalChart(p: ProfileRow): Promise<Chart> | null {
  if (!p.birth_date || p.lat === null || p.lon === null) return null;
  return chart({
    name: p.display_name, date: p.birth_date, time: p.time_unknown ? null : p.birth_time?.slice(0, 5) ?? null,
    lat: p.lat, lon: p.lon, timezone: p.timezone, houseSystem: p.house_system,
  });
}

/** Planet positions right now (UTC, place does not matter for positions). */
export function skyNow(now = new Date()): Promise<Chart> {
  const iso = now.toISOString();
  return chart({ date: iso.slice(0, 10), time: iso.slice(11, 16), lat: 51.48, lon: 0, timezone: 'Etc/GMT' });
}

const ASPECTS = [
  { type: 'conjunction', angle: 0 }, { type: 'opposition', angle: 180 }, { type: 'trine', angle: 120 },
  { type: 'square', angle: 90 }, { type: 'sextile', angle: 60 },
] as const;
const FAST: PointKey[] = ['moon'];
const TRANSITING: PointKey[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const NATAL: PointKey[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'chiron', 'lilith', 'northNode', 'asc', 'mc'];

export interface Transit { transiting: PointKey; natal: PointKey; type: (typeof ASPECTS)[number]['type']; orb: number }

/** Transits from today's sky to the natal chart, tightest first (Moon gets a wider orb but ranks last on ties). */
export function personalTransits(sky: Chart, natal: Chart, limit = 6): Transit[] {
  const natalPoints = new Map<PointKey, Position>(natal.points.map((p) => [p.key, p]));
  if (natal.angles) { natalPoints.set('asc', natal.angles.asc); natalPoints.set('mc', natal.angles.mc); }
  const out: Transit[] = [];
  for (const t of sky.points) {
    if (!TRANSITING.includes(t.key)) continue;
    for (const key of NATAL) {
      const n = natalPoints.get(key);
      if (!n) continue;
      let d = Math.abs(t.longitude - n.longitude) % 360;
      if (d > 180) d = 360 - d;
      const maxOrb = FAST.includes(t.key) ? 4 : t.key === 'sun' || t.key === 'mercury' || t.key === 'venus' || t.key === 'mars' ? 2 : 1.5;
      for (const a of ASPECTS) {
        const orb = Math.abs(d - a.angle);
        if (orb <= maxOrb) out.push({ transiting: t.key, natal: key, type: a.type, orb: Math.round(orb * 10) / 10 });
      }
    }
  }
  return out.sort((a, b) => a.orb - b.orb).slice(0, limit);
}

/** Moon phase name from the Sun-Moon angle. */
export function moonPhase(sky: Chart): { key: string; angle: number } {
  const sun = sky.points.find((p) => p.key === 'sun')!.longitude;
  const moon = sky.points.find((p) => p.key === 'moon')!.longitude;
  const angle = ((moon - sun) % 360 + 360) % 360;
  const names = ['new', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'full', 'waningGibbous', 'lastQuarter', 'waningCrescent'];
  return { key: names[Math.round(angle / 45) % 8], angle };
}

/** The same card all day for one person, a different one tomorrow. */
export function cardOfTheDay(userId: string, day = new Date().toISOString().slice(0, 10)): Card {
  let h = 2166136261;
  for (const ch of `${userId}:${day}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return deck[(h >>> 0) % deck.length];
}

const pos = (p: Position) => `${p.degree}°${String(p.minute).padStart(2, '0')}' ${p.sign}${p.retrograde ? ' (retrograde)' : ''}${p.house ? `, house ${p.house}` : ''}`;

/** Compact plain-text description of a chart for the model. */
export function describeChart(c: Chart): string {
  const lines = c.points.map((p) => `${p.key}: ${pos(p)}`);
  if (c.angles) lines.push(`ascendant: ${pos(c.angles.asc)}`, `midheaven: ${pos(c.angles.mc)}`);
  else lines.push('birth time unknown: no houses or ascendant; the Moon sign may be uncertain');
  const aspects = c.aspects.slice(0, 14).map((a) => `${a.a} ${a.type} ${a.b} (orb ${a.orb.toFixed(1)})`);
  return `${lines.join('\n')}\nmain aspects: ${aspects.join('; ')}`;
}

export const describeTransits = (ts: Transit[]) =>
  ts.length ? ts.map((t) => `transiting ${t.transiting} ${t.type} natal ${t.natal} (orb ${t.orb})`).join('\n') : 'no tight transits today';
