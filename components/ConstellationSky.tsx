'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dictionary, Locale } from '../lib/i18n';
import { localePath } from '../lib/i18n';
import { POINT_GLYPH, SIGN_GLYPH } from '../lib/glyphs';
import { groupComposite, type Link, type Sky, type Star } from '../lib/constellation';

const SIZE = 760;
const C = SIZE / 2;
const GOLD = '#f0d38a';
const RED = '#e79a9a';
const IVORY = '#f6f0e4';

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((acc, [k, x]) => acc.replaceAll(`{${k}}`, String(x)), s);

/** Small deterministic hash, so background stars and positions never jump between renders. */
const hash = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };

function layout(sky: Sky) {
  const others = sky.stars.filter((s) => s.id !== 'me');
  const pos = new Map<string, { x: number; y: number }>([['me', { x: C, y: C }]]);
  const mine = others.map((s) => sky.links.find((k) => k.from === 'me' && k.to === s.id)?.strength ?? 0);
  const lo = Math.min(...mine), hi = Math.max(...mine);
  others.forEach((s, i) => {
    const rel = hi > lo ? (mine.at(i)! - lo) / (hi - lo) : 0.5;
    const r = 290 - rel * 150;                            // closer = more between you
    const a = (i / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2 + (hash(s.id) - 0.5) * 0.35;
    pos.set(s.id, { x: Math.round(C + r * Math.cos(a)), y: Math.round(C + r * Math.sin(a)) }); // whole pixels: server and browser agree
  });
  return pos;
}

/** Seeded random numbers (mulberry32): the same faint background stars on every render. */
function seeded(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
const rnd = seeded(11);
const r1 = (x: number) => Math.round(x * 10) / 10;
const BACKDROP = Array.from({ length: 110 }, () => ({ x: r1(rnd() * SIZE), y: r1(rnd() * SIZE), r: r1(0.4 + rnd() * 1.1), o: r1(0.12 + rnd() * 0.45) }));

export default function ConstellationSky({ lang, t, initial }: { lang: Locale; t: Dictionary; initial?: Sky }) {
  const [sky, setSky] = useState<Sky | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<Link | null>(null);
  const [group, setGroup] = useState<string[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (initial) return;
    fetch('/api/constellation').then(async (r) => {
      const body = await r.json();
      if (!r.ok) setError(body.error === 'profile' ? 'profile' : 'error');
      else setSky(body);
    }).catch(() => setError('error'));
  }, [initial]);

  const pos = useMemo(() => (sky ? layout(sky) : new Map()), [sky]);
  const name = (id: string) => sky?.stars.find((s) => s.id === id)?.name ?? '';
  const week = sky?.links.filter((l) => l.week) ?? [];

  const composite = useMemo(() => {
    if (!sky || group.length < 2) return null;
    return groupComposite(sky.stars.filter((s) => group.includes(s.id)));
  }, [sky, group]);

  async function download() {
    const svg = svgRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1520; canvas.height = 1520;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, 1520, 1520);
    const a = document.createElement('a');
    a.download = 'my-constellation-astrologybird.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  if (error === 'profile') {
    return <div className="card con-empty"><p>{t.con.needProfile}</p><a className="btn" href={localePath(lang, '/account')}>{t.con.toAccount}</a></div>;
  }
  if (error) return <p className="error con-center">{t.con.error}</p>;
  if (!sky) return <p className="hint con-center">{t.con.loading}</p>;

  const tone = (l: Link) => (l.tone === 'friction' ? RED : GOLD);
  const toneText = (l: Link) => (l.tone === 'flow' ? t.con.toneFlow : l.tone === 'friction' ? t.con.toneFriction : t.con.toneBoth);
  const pickStar = (s: Star) => {
    if (s.id === 'me') return;
    setPick(sky.links.find((l) => l.from === 'me' && l.to === s.id) ?? null);
  };

  return (
    <div className="con">
      <div className="con-sky">
        <svg ref={svgRef} viewBox={`0 0 ${SIZE} ${SIZE}`} className="con-svg" role="img" aria-label={t.con.title} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="con-bg" cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#1b2758" />
              <stop offset="100%" stopColor="#0b1026" />
            </radialGradient>
            <filter id="con-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect width={SIZE} height={SIZE} fill="url(#con-bg)" />
          {BACKDROP.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={IVORY} opacity={d.o} />)}

          {sky.links.map((l) => {
            const a = pos.get(l.from)!, b = pos.get(l.to)!;
            const mine = l.from === 'me';
            const active = pick && pick.from === l.from && pick.to === l.to;
            return (
              <g key={`${l.from}-${l.to}`} onClick={() => setPick(l)} style={{ cursor: 'pointer' }}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={16} />
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={tone(l)}
                  strokeWidth={Math.round(((mine ? 1.2 : 0.8) + l.strength * (mine ? 3 : 1.6) + (active ? 1.5 : 0)) * 10) / 10}
                  strokeOpacity={mine ? 0.9 : 0.45}
                  strokeDasharray={mine ? undefined : '3 6'}
                  strokeLinecap="round"
                  className={l.week ? 'con-pulse' : undefined}
                />
                {l.tone === 'both' && (
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={RED} strokeOpacity={mine ? 0.95 : 0.5}
                    strokeWidth={Math.round(((mine ? 1.2 : 0.8) + l.strength * (mine ? 3 : 1.6) + (active ? 1.5 : 0)) * 10) / 10} strokeDasharray="10 12" />
                )}
              </g>
            );
          })}

          {sky.stars.map((s) => {
            const p = pos.get(s.id)!;
            const me = s.id === 'me';
            const inGroup = group.includes(s.id);
            return (
              <g key={s.id} onClick={() => pickStar(s)} style={{ cursor: me ? 'default' : 'pointer' }}>
                <circle cx={p.x} cy={p.y} r={me ? 14 : 9} fill={GOLD} filter="url(#con-glow)" />
                {me && <circle cx={p.x} cy={p.y} r={22} fill="none" stroke={GOLD} strokeOpacity={0.5} />}
                {inGroup && <circle cx={p.x} cy={p.y} r={me ? 30 : 17} fill="none" stroke={IVORY} strokeDasharray="2 4" />}
                <text x={p.x} y={me || p.y >= C ? p.y + (me ? 44 : 30) : p.y - 34} textAnchor="middle" fill={IVORY} fontFamily="Cormorant Garamond, Georgia, serif" fontSize={me ? 24 : 19} fontWeight={600}>{s.name}</text>
                <text x={p.x} y={me || p.y >= C ? p.y + (me ? 64 : 48) : p.y - 16} textAnchor="middle" fill={GOLD} fillOpacity={0.8} fontFamily="Noto Sans Symbols, Noto Sans Symbols 2, Segoe UI Symbol, sans-serif" fontSize={13}>
                  {`${POINT_GLYPH.sun}${SIGN_GLYPH[s.sun]}  ${POINT_GLYPH.moon}${SIGN_GLYPH[s.moon]}`}
                </text>
              </g>
            );
          })}
          <text x={24} y={SIZE - 24} fill={GOLD} fillOpacity={0.7} fontFamily="Inter, sans-serif" fontSize={13} letterSpacing="2">ASTROLOGYBIRD · YOUR CONSTELLATION</text>
        </svg>
        <div className="legend con-legend">
          <span><i style={{ background: GOLD }} />{t.con.flow}</span>
          <span><i style={{ background: RED }} />{t.con.friction}</span>
          <span><i style={{ background: `linear-gradient(90deg, ${GOLD} 50%, ${RED} 50%)` }} />{t.con.both}</span>
          <span><i className="con-pulse-dot" />{t.con.legendWeek}</span>
        </div>
      </div>

      <aside className="con-side">
        {sky.stars.length === 1 && (
          <div className="card con-empty"><p>{t.con.empty}</p><a className="btn btn-small" href={localePath(lang, '/account')}>{t.con.addPeople}</a></div>
        )}

        <div className="card">
          {pick ? (
            <>
              <h3>{fill(t.con.between, { a: name(pick.from), b: name(pick.to) })}</h3>
              <p className="con-tone">{toneText(pick)}</p>
              <ul className="aspects">
                {pick.contacts.map((c, i) => (
                  <li key={i}>
                    <span className={c.tone === 'flow' ? 'type-harmony' : 'type-tension'}>●</span>
                    <span>{name(pick.from)}: <span className="sym">{POINT_GLYPH[c.a]}</span> {t.points[c.a as keyof typeof t.points]} · {t.aspects[c.type]} · {name(pick.to)}: <span className="sym">{POINT_GLYPH[c.b]}</span> {t.points[c.b as keyof typeof t.points]}</span>
                    <span className="orb">{c.orb.toFixed(1)}°</span>
                  </li>
                ))}
              </ul>
              {pick.from === 'me' && (
                <a className="btn btn-small btn-ghost" href={`${localePath(lang, '/relationship')}?a=me&b=${pick.to}`}>{t.con.openRel}</a>
              )}
            </>
          ) : <p className="hint">{t.con.pickHint}</p>}
        </div>

        <div className="card">
          <h3>{t.con.weekTitle}</h3>
          {week.length ? (
            <ul className="con-week">
              {week.map((l) => (
                <li key={`${l.from}-${l.to}`}>
                  <span className="sym">{POINT_GLYPH[l.week!.transiting]}</span>
                  {fill(t.con.weekLine, { planet: t.points[l.week!.transiting as keyof typeof t.points], a: name(l.from), b: name(l.to) })}
                </li>
              ))}
            </ul>
          ) : <p className="hint">{t.con.weekNone}</p>}
        </div>

        {sky.stars.length > 2 && (
          <div className="card">
            <h3>{t.con.groupTitle}</h3>
            <p className="hint">{t.con.groupLead}</p>
            <div className="con-group">
              {sky.stars.map((s) => (
                <label key={s.id} className="check">
                  <input type="checkbox" checked={group.includes(s.id)} onChange={(e) => setGroup(e.target.checked ? [...group, s.id] : group.filter((g) => g !== s.id))} />
                  {s.name}
                </label>
              ))}
            </div>
            {composite ? (
              <p className="con-tone">{fill(t.con.groupResult, { sun: t.signs[composite.sun!], moon: t.signs[composite.moon!], venus: t.signs[composite.venus!] })}</p>
            ) : <p className="hint">{t.con.groupPick}</p>}
          </div>
        )}

        {sky.hidden > 0 && <p className="notice">{fill(t.con.hidden, { n: sky.hidden })}</p>}
        <button type="button" className="btn btn-small btn-ghost" onClick={download}>{t.con.download}</button>
        <p className="hint">{t.con.privacy}</p>
      </aside>
    </div>
  );
}
