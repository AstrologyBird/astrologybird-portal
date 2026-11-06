import type { Chart, Position } from '../lib/chart-types';
import { POINT_GLYPH, SIGN_GLYPH, SIGNS, ELEMENT_OF } from '../lib/glyphs';
import type { Dictionary } from '../lib/i18n';

const SIZE = 640;
const C = SIZE / 2;
const R_OUT = 306;
const R_ZOD = 264;
const R_TICK = 254;
const R_PLANET = 224;
const R_HOUSE_NUM = 136;
const R_ASPECT = 118;

const ELEMENT_COLOR = { fire: '#e8a96b', earth: '#b9c98a', air: '#c9c3e8', water: '#8fc3d3' } as const;
const HARMONY = new Set(['trine', 'sextile']);

function spread(longitudes: number[], minGap = 7.5): number[] {
  // Push glyph positions apart so symbols never overlap, keeping order.
  const order = longitudes.map((l, i) => ({ l, i })).sort((a, b) => a.l - b.l);
  const pos = order.map((o) => o.l);
  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    for (let k = 0; k < pos.length; k++) {
      const next = (k + 1) % pos.length;
      let gap = pos[next] - pos[k];
      if (next === 0) gap += 360;
      if (pos.length > 1 && gap < minGap) {
        const push = (minGap - gap) / 2;
        pos[k] -= push;
        pos[next] += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const out = new Array<number>(longitudes.length);
  order.forEach((o, k) => { out[o.i] = pos[k]; });
  return out;
}

export default function ChartWheel({ chart, t }: { chart: Chart; t: Dictionary }) {
  const asc = chart.angles?.asc.longitude ?? 0;
  const theta = (lon: number) => ((180 + lon - asc) * Math.PI) / 180;
  const xy = (lon: number, r: number) => [C + r * Math.cos(theta(lon)), C - r * Math.sin(theta(lon))] as const;

  const planets: Position[] = chart.points;
  const shown = spread(planets.map((p) => p.longitude));
  const byKey = new Map<string, Position>(planets.map((p) => [p.key, p]));
  if (chart.angles) { byKey.set('asc', chart.angles.asc); byKey.set('mc', chart.angles.mc); }

  const ring = (r: number, props: React.SVGProps<SVGCircleElement> = {}) => <circle cx={C} cy={C} r={r} fill="none" {...props} />;
  const line = (lon: number, r1: number, r2: number, props: React.SVGProps<SVGLineElement> = {}) => {
    const [x1, y1] = xy(lon, r1); const [x2, y2] = xy(lon, r2);
    return <line x1={x1} y1={y1} x2={x2} y2={y2} {...props} />;
  };

  const label = `${t.result.bigThree}: ${t.signs[chart.bigThree.sun]}, ${t.signs[chart.bigThree.moon]}${chart.bigThree.rising ? ', ' + t.signs[chart.bigThree.rising] : ''}`;

  return (
    <svg className="wheel" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
      <defs>
        <radialGradient id="wheel-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a2547" />
          <stop offset="100%" stopColor="#0e1630" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={R_OUT} fill="url(#wheel-bg)" />

      {/* Zodiac band */}
      {SIGNS.map((s, i) => {
        const start = i * 30;
        const [gx, gy] = xy(start + 15, (R_OUT + R_ZOD) / 2);
        return (
          <g key={s}>
            {line(start, R_ZOD, R_OUT, { stroke: 'rgba(240,211,138,0.35)', strokeWidth: 1 })}
            <text x={gx} y={gy} textAnchor="middle" dominantBaseline="central" fontSize="22" fill={ELEMENT_COLOR[ELEMENT_OF(i)]} style={{ fontFamily: 'var(--symbol)' }}>
              {SIGN_GLYPH[s]}
            </text>
          </g>
        );
      })}
      {Array.from({ length: 72 }, (_, k) => line(k * 5, R_TICK, R_ZOD, { key: k, stroke: 'rgba(240,211,138,0.3)', strokeWidth: k % 2 ? 0.6 : 1 }))}
      {ring(R_OUT, { stroke: '#f0d38a', strokeWidth: 1.4 })}
      {ring(R_ZOD, { stroke: '#f0d38a', strokeWidth: 1 })}
      {ring(R_TICK, { stroke: 'rgba(240,211,138,0.35)', strokeWidth: 0.8 })}
      {ring(R_ASPECT, { stroke: 'rgba(240,211,138,0.35)', strokeWidth: 0.8 })}

      {/* Houses */}
      {chart.houses?.map((h, i) => {
        const next = chart.houses![(i + 1) % 12].longitude;
        const span = ((next - h.longitude) % 360 + 360) % 360;
        const [nx, ny] = xy(h.longitude + span / 2, R_HOUSE_NUM);
        const isAngle = i % 3 === 0;
        return (
          <g key={h.house}>
            {line(h.longitude, R_ASPECT, R_TICK, { stroke: isAngle ? '#f0d38a' : 'rgba(240,211,138,0.28)', strokeWidth: isAngle ? 1.6 : 0.9 })}
            <text x={nx} y={ny} textAnchor="middle" dominantBaseline="central" fontSize="12" fill="#8a8fad">{h.house}</text>
          </g>
        );
      })}

      {/* Aspect lines */}
      {chart.aspects.filter((a) => a.type !== 'conjunction').map((a, i) => {
        const p = byKey.get(a.a); const q = byKey.get(a.b);
        if (!p || !q) return null;
        const [x1, y1] = xy(p.longitude, R_ASPECT); const [x2, y2] = xy(q.longitude, R_ASPECT);
        const harmonious = HARMONY.has(a.type);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={harmonious ? '#8fd3c7' : '#e79a9a'}
            strokeWidth={a.orb < 2 ? 1.4 : 0.9}
            strokeOpacity={a.orb < 2 ? 0.9 : 0.55}
            strokeDasharray={a.type === 'sextile' ? '4 3' : undefined} />
        );
      })}

      {/* Planets */}
      {planets.map((p, i) => {
        const [tx, ty] = xy(p.longitude, R_TICK);
        const [ix, iy] = xy(p.longitude, R_TICK - 8);
        const [gx, gy] = xy(shown[i], R_PLANET);
        const [dx, dy] = xy(shown[i], R_PLANET - 22);
        const minor = ['northNode', 'southNode', 'chiron', 'lilith'].includes(p.key);
        return (
          <g key={p.key}>
            <line x1={tx} y1={ty} x2={ix} y2={iy} stroke="#f0d38a" strokeWidth="1.4" />
            <line x1={ix} y1={iy} x2={gx + (ix - gx) * 0.5} y2={gy + (iy - gy) * 0.5} stroke="rgba(240,211,138,0.25)" strokeWidth="0.8" />
            <text x={gx} y={gy} textAnchor="middle" dominantBaseline="central" fontSize={minor ? 17 : 21} fill={minor ? '#b8b4c8' : '#f6f0e4'} style={{ fontFamily: 'var(--symbol)' }}>
              {POINT_GLYPH[p.key]}
            </text>
            <text x={dx} y={dy} textAnchor="middle" dominantBaseline="central" fontSize="10" fill="#8a8fad">
              {p.degree}°{p.retrograde ? 'ʀ' : ''}
            </text>
            <title>{`${t.points[p.key]} ${p.degree}°${String(p.minute).padStart(2, '0')}′ ${t.signs[p.sign]}${p.retrograde ? ' (' + t.result.retrograde + ')' : ''}`}</title>
          </g>
        );
      })}

      {/* Axis labels just beside each angle line */}
      {chart.angles && (['asc', 'mc', 'dsc', 'ic'] as const).map((k) => {
        const [x, y] = xy(chart.angles![k].longitude + 5, 156);
        return <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="600" fill="#f0d38a">{POINT_GLYPH[k]}</text>;
      })}
    </svg>
  );
}
