// Your Constellation: everyone who matters to you as one sky.
// Pure functions: the API route fetches the charts, this file turns them into stars and lines.
import type { AspectType, Chart, PointKey, SignKey } from './chart-types';
import { SIGNS } from './glyphs';

/** Free accounts see this many people in their constellation; Inner Circle sees everyone they saved. */
export const FREE_CONSTELLATION = 5;

/** Points that carry a relationship, with how much each one counts. */
const WEIGHT: Partial<Record<PointKey, number>> = { sun: 1, moon: 1, venus: 1, mars: 1, asc: 1, mercury: 0.7, jupiter: 0.6, saturn: 0.6 };
const ORB: Record<AspectType, number> = { conjunction: 6, opposition: 6, trine: 5, square: 5, sextile: 3 };
const ANGLE: Record<AspectType, number> = { conjunction: 0, opposition: 180, trine: 120, square: 90, sextile: 60 };
const SOFT = new Set<PointKey>(['sun', 'moon', 'venus', 'jupiter', 'mercury']);

export type Tone = 'flow' | 'friction' | 'both';

export interface Contact { a: PointKey; b: PointKey; type: AspectType; orb: number; weight: number; tone: 'flow' | 'friction' }

export interface Star {
  id: string;            // 'me' or the person's id
  name: string;
  relation: string | null;
  sun: SignKey;
  moon: SignKey;
  rising: SignKey | null;
  /** Longitudes used for the group composite. */
  points: Partial<Record<PointKey, number>>;
}

export interface Link {
  from: string;
  to: string;
  tone: Tone;
  strength: number;      // 0..1, relative to the strongest link in this sky
  harmony: number;
  tension: number;
  contacts: Contact[];   // strongest first, at most 3
  /** Set when a planet in today's sky touches the strongest contact of this line. */
  week: { transiting: PointKey; person: string; point: PointKey; type: AspectType } | null;
}

export interface Sky { stars: Star[]; links: Link[]; hidden: number; member: boolean }

const pointsOf = (c: Chart) => {
  const m = new Map<PointKey, number>();
  for (const p of c.points) m.set(p.key, p.longitude);
  if (c.angles) m.set('asc', c.angles.asc.longitude);
  return m;
};

const separation = (x: number, y: number) => {
  const d = Math.abs(x - y) % 360;
  return d > 180 ? 360 - d : d;
};

/** Cross aspects between two charts, weighted by the points involved and how exact they are. */
export function contacts(a: Chart, b: Chart): Contact[] {
  const pa = pointsOf(a);
  const pb = pointsOf(b);
  const out: Contact[] = [];
  for (const [ka, la] of pa) {
    const wa = WEIGHT[ka];
    if (!wa) continue;
    for (const [kb, lb] of pb) {
      const wb = WEIGHT[kb];
      if (!wb) continue;
      const d = separation(la, lb);
      for (const type of Object.keys(ANGLE) as AspectType[]) {
        const orb = Math.abs(d - ANGLE[type]);
        if (orb > ORB[type]) continue;
        const weight = (1 - orb / ORB[type]) * wa * wb;
        const tone = type === 'trine' || type === 'sextile' ? 'flow'
          : type === 'conjunction' ? (SOFT.has(ka) && SOFT.has(kb) ? 'flow' : 'friction')
          : 'friction';
        out.push({ a: ka, b: kb, type, orb: Math.round(orb * 10) / 10, weight, tone });
      }
    }
  }
  return out.sort((x, y) => y.weight - x.weight);
}

function link(from: string, to: string, a: Chart, b: Chart): Omit<Link, 'strength'> {
  const all = contacts(a, b);
  const harmony = all.filter((c) => c.tone === 'flow').reduce((s, c) => s + c.weight, 0);
  const tension = all.filter((c) => c.tone === 'friction').reduce((s, c) => s + c.weight, 0);
  const tone: Tone = harmony >= tension * 1.25 ? 'flow' : tension >= harmony * 1.25 ? 'friction' : 'both';
  return { from, to, tone, harmony, tension, contacts: all.slice(0, 3), week: null };
}

const TRANSITING: PointKey[] = ['mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const HARD: AspectType[] = ['conjunction', 'square', 'opposition'];

/** Which line lights up this week: a slow planet in the sky within 1° of a hard aspect to the strongest contact. */
function weekTouch(l: Omit<Link, 'strength'>, a: Chart, b: Chart, sky: Chart): Link['week'] {
  const top = l.contacts[0];
  if (!top) return null;
  const pa = pointsOf(a).get(top.a);
  const pb = pointsOf(b).get(top.b);
  for (const t of sky.points) {
    if (!TRANSITING.includes(t.key)) continue;
    for (const [person, point, lon] of [[l.from, top.a, pa], [l.to, top.b, pb]] as const) {
      if (lon === undefined) continue;
      const d = separation(t.longitude, lon);
      for (const type of HARD) if (Math.abs(d - ANGLE[type]) <= 1) return { transiting: t.key, person, point, type };
    }
  }
  return null;
}

export function star(id: string, name: string, relation: string | null, c: Chart): Star {
  const keep: PointKey[] = ['sun', 'moon', 'mercury', 'venus', 'mars'];
  const points: Star['points'] = {};
  for (const p of c.points) if (keep.includes(p.key)) points[p.key] = p.longitude;
  return { id, name, relation, sun: c.bigThree.sun, moon: c.bigThree.moon, rising: c.bigThree.rising, points };
}

/**
 * Build the sky: me in the middle, a line to each person, and lines between people
 * that share real contacts. `charts[0]` must be me.
 */
export function buildSky(entries: { star: Star; chart: Chart }[], sky: Chart | null, hidden: number, member: boolean): Sky {
  const raw: Omit<Link, 'strength'>[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries.at(i)!, b = entries.at(j)!;
      const l = link(a.star.id, b.star.id, a.chart, b.chart);
      if (sky && i === 0) l.week = weekTouch(l, a.chart, b.chart, sky);
      raw.push(l);
    }
  }
  const max = Math.max(0.0001, ...raw.map((l) => l.harmony + l.tension));
  const links = raw
    .map((l) => ({ ...l, strength: Math.round(((l.harmony + l.tension) / max) * 100) / 100 }))
    // Lines between two other people only when they are clearly there.
    .filter((l) => l.from === 'me' || l.strength >= 0.35);
  return { stars: entries.map((e) => e.star), links, hidden, member };
}

/** Group composite: the circular mean of each point over everyone selected. */
export function groupComposite(stars: Star[]): Partial<Record<PointKey, SignKey>> {
  const out: Partial<Record<PointKey, SignKey>> = {};
  for (const key of ['sun', 'moon', 'mercury', 'venus', 'mars'] as PointKey[]) {
    const lons = stars.map((s) => s.points[key]).filter((x): x is number => x !== undefined);
    if (!lons.length) continue;
    const x = lons.reduce((s, l) => s + Math.cos((l * Math.PI) / 180), 0);
    const y = lons.reduce((s, l) => s + Math.sin((l * Math.PI) / 180), 0);
    const mean = (((Math.atan2(y, x) * 180) / Math.PI) % 360 + 360) % 360;
    out[key] = SIGNS.at(Math.floor(mean / 30))!;
  }
  return out;
}
