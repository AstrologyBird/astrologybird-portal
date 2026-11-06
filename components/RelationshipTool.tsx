'use client';

import { useEffect, useRef, useState } from 'react';
import type { Chart, Place, Position, Relationship } from '../lib/chart-types';
import type { Dictionary, Locale } from '../lib/i18n';
import { POINT_GLYPH, SIGN_GLYPH } from '../lib/glyphs';
import PlaceSearch from './PlaceSearch';
import ChartWheel from './ChartWheel';

const STORAGE_KEY = 'astrologybird:last-relationship-input';
const HARMONY = new Set(['trine', 'sextile']);

type Person = { name: string; date: string; time: string; timeUnknown: boolean; place: Place | null };
const empty: Person = { name: '', date: '', time: '', timeUnknown: false, place: null };

const fmt = (p: Position) => `${p.degree}°${String(p.minute).padStart(2, '0')}′`;
const fill = (s: string, a: string, b: string) => s.replace('{a}', a).replace('{b}', b);

function PersonFields({ title, p, set, lang, t }: { title: string; p: Person; set: (p: Person) => void; lang: Locale; t: Dictionary }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <label>
        {t.form.name}
        <input value={p.name} maxLength={40} onChange={(e) => set({ ...p, name: e.target.value })} />
      </label>
      <div className="form-row">
        <label>
          {t.form.date}
          <input type="date" required min="1800-01-01" max="2399-12-31" value={p.date} onChange={(e) => set({ ...p, date: e.target.value })} />
        </label>
        <label>
          {t.form.time}
          <input type="time" required={!p.timeUnknown} disabled={p.timeUnknown} value={p.time} onChange={(e) => set({ ...p, time: e.target.value })} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={p.timeUnknown} onChange={(e) => set({ ...p, timeUnknown: e.target.checked })} />
        {t.form.timeUnknown}
      </label>
      <PlaceSearch lang={lang} t={t} value={p.place} onChange={(place) => set({ ...p, place })} />
    </div>
  );
}

/** Shape the composite like a chart so the wheel can draw it. */
function compositeAsChart(r: Relationship): Chart {
  const c = r.composite;
  const sign = (k: string) => c.points.find((p) => p.key === k)!.sign;
  return {
    name: null, input: r.a.input, utc: r.a.utc, timeKnown: Boolean(c.houses), houseSystem: r.a.houseSystem,
    points: c.points, angles: c.angles, houses: c.houses, aspects: c.aspects, elements: c.elements, modalities: c.modalities,
    bigThree: { sun: sign('sun'), moon: sign('moon'), rising: c.angles?.asc.sign ?? null }, moonSignUncertain: false, warnings: [],
  };
}

export default function RelationshipTool({ lang, t, waitlistUrl }: { lang: Locale; t: Dictionary; waitlistUrl: string }) {
  const [a, setA] = useState<Person>(empty);
  const [b, setB] = useState<Person>(empty);
  const [result, setResult] = useState<Relationship | null>(null);
  const [tab, setTab] = useState<'synastry' | 'composite'>('synastry');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { const s = JSON.parse(saved); if (s.a) setA(s.a); if (s.b) setB(s.b); }
    } catch { /* storage unavailable */ }
  }, []);

  const nameA = a.name.trim() || t.rel.personA;
  const nameB = b.name.trim() || t.rel.personB;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!a.place || !b.place) { setError(t.form.errorPlace); return; }
    setBusy(true);
    const toInput = (p: Person) => ({ name: p.name || undefined, date: p.date, time: p.timeUnknown ? null : p.time, lat: p.place!.lat, lon: p.place!.lon, timezone: p.place!.timezone });
    try {
      const res = await fetch('/api/relationship', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: toInput(a), b: toInput(b) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ a, b })); } catch { /* ignore */ }
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch {
      setError(t.form.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  const syn = result?.synastry;
  const counts = syn ? {
    flowing: syn.aspects.filter((x) => HARMONY.has(x.type)).length,
    friction: syn.aspects.filter((x) => x.type === 'square' || x.type === 'opposition').length,
    fusion: syn.aspects.filter((x) => x.type === 'conjunction').length,
  } : null;
  const composite = result ? compositeAsChart(result) : null;

  return (
    <>
      <form onSubmit={submit}>
        <div className="person-grid">
          <PersonFields title={t.rel.personA} p={a} set={setA} lang={lang} t={t} />
          <PersonFields title={t.rel.personB} p={b} set={setB} lang={lang} t={t} />
        </div>
        <div className="submit-row">
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? t.form.calculating : t.rel.submit}</button>
        </div>
      </form>

      {result && syn && counts && composite && (
        <div className="result" ref={resultRef}>
          <div className="result-head">
            <h2>{nameA} &amp; {nameB}</h2>
          </div>

          <div className="tabs" role="tablist">
            {(['synastry', 'composite'] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={`btn btn-small ${tab === k ? '' : 'btn-ghost'}`} onClick={() => setTab(k)}>
                {k === 'synastry' ? t.rel.tabSynastry : t.rel.tabComposite}
              </button>
            ))}
          </div>

          {tab === 'synastry' ? (
            <>
              <p className="lead" style={{ textAlign: 'center' }}>{fill(t.rel.synastryIntro, nameA, nameB)}</p>
              <div className="legend">
                <span><i style={{ background: '#f6f0e4' }} />{nameA}</span>
                <span><i style={{ background: '#c9a7f0' }} />{nameB}</span>
                <span><i style={{ background: '#8fd3c7' }} />{t.rel.flowing}</span>
                <span><i style={{ background: '#e79a9a' }} />{t.rel.friction}</span>
              </div>
              <div className="card wheel-wrap">
                <ChartWheel chart={result.a} t={t} outer={result.b.points} outerAngles={result.b.angles} crossAspects={syn.aspects}
                  ariaLabel={`${nameA} & ${nameB}: ${t.rel.tabSynastry}`} />
              </div>

              <section className="card">
                <h3 style={{ marginBottom: 14, textAlign: 'center' }}>{t.rel.balanceTitle}</h3>
                <div className="balance">
                  <div><strong>{counts.flowing}</strong><span>{t.rel.flowing}</span></div>
                  <div><strong>{counts.friction}</strong><span>{t.rel.friction}</span></div>
                  <div><strong>{counts.fusion}</strong><span>{t.rel.fusion}</span></div>
                </div>
              </section>

              <section className="card">
                <h3 style={{ marginBottom: 10 }}>{t.rel.crossAspects}</h3>
                <ul className="aspects" style={{ maxHeight: 520 }}>
                  {syn.aspects.map((x, i) => (
                    <li key={i}>
                      <span className="sym">{POINT_GLYPH[x.a]}</span>
                      <span>{t.points[x.a]} <small style={{ color: 'var(--quiet)' }}>({nameA})</small></span>
                      <span className={x.type === 'conjunction' ? 'type-neutral' : HARMONY.has(x.type) ? 'type-harmony' : 'type-tension'}>{t.aspects[x.type]}</span>
                      <span className="sym" style={{ color: '#c9a7f0' }}>{POINT_GLYPH[x.b]}</span>
                      <span>{t.points[x.b]} <small style={{ color: 'var(--quiet)' }}>({nameB})</small></span>
                      <span className="orb">{t.result.orb} {x.orb.toFixed(1)}°</span>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="grid-2">
                {([[syn.aInB, result.a, nameA, nameB], [syn.bInA, result.b, nameB, nameA]] as const).map(([list, chart, who, other]) => (
                  <section className="card" key={who}>
                    <h3 style={{ marginBottom: 10 }}>{fill(t.rel.overlays, who, other)}</h3>
                    {list ? (
                      <ul className="overlay-list">
                        {list.map((o) => {
                          const p = chart.points.find((q) => q.key === o.key)!;
                          return (
                            <li key={o.key}>
                              <span className="sym">{POINT_GLYPH[o.key]}</span>
                              {t.points[o.key]}: {t.result.house.toLowerCase()} {o.house}
                              <small style={{ color: 'var(--quiet)' }}> · {t.signs[p.sign]} {fmt(p)}</small>
                            </li>
                          );
                        })}
                      </ul>
                    ) : <p className="hint" style={{ margin: 0 }}>{fill(t.rel.overlayNeedsTime, who, other)}</p>}
                  </section>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="lead" style={{ textAlign: 'center' }}>{t.rel.compositeIntro}</p>
              <section className="bigthree">
                {([['sun', t.rel.compositeSun, t.rel.compositeSunText], ['moon', t.rel.compositeMoon, t.rel.compositeMoonText], ['rising', t.rel.compositeRising, t.rel.compositeRisingText]] as const).map(([k, label, meaning]) => {
                  const sign = composite.bigThree[k];
                  return (
                    <div className="card big" key={k}>
                      <div className="label">{label}</div>
                      {sign ? (
                        <>
                          <div className="glyph" aria-hidden="true">{SIGN_GLYPH[sign]}</div>
                          <div className="sign">{t.signs[sign]}</div>
                          <div className="meaning">{meaning}</div>
                          <div className="kw">{t.signKeywords[sign]}</div>
                        </>
                      ) : <div className="meaning" style={{ marginTop: 24 }}>{t.result.risingUnknown}</div>}
                    </div>
                  );
                })}
              </section>
              <div className="card wheel-wrap"><ChartWheel chart={composite} t={t} ariaLabel={`${nameA} & ${nameB}: ${t.rel.tabComposite}`} /></div>
              <div className="grid-2">
                <section className="card">
                  <h3 style={{ marginBottom: 10 }}>{t.result.positions}</h3>
                  <table>
                    <tbody>
                      {[...composite.points, ...(composite.angles ? [composite.angles.asc, composite.angles.mc] : [])].map((p) => (
                        <tr key={p.key}>
                          <td className="sym">{POINT_GLYPH[p.key]}</td>
                          <td>{t.points[p.key]}</td>
                          <td><span style={{ fontFamily: 'var(--symbol)', color: 'var(--gold)' }}>{SIGN_GLYPH[p.sign]}</span> {t.signs[p.sign]}</td>
                          <td className="num">{fmt(p)}</td>
                          {composite.timeKnown && <td className="num">{p.house ?? ''}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
                <section className="card">
                  <h3 style={{ marginBottom: 10 }}>{t.result.aspects}</h3>
                  <ul className="aspects">
                    {composite.aspects.map((x, i) => (
                      <li key={i}>
                        <span className="sym">{POINT_GLYPH[x.a]}</span><span>{t.points[x.a]}</span>
                        <span className={x.type === 'conjunction' ? 'type-neutral' : HARMONY.has(x.type) ? 'type-harmony' : 'type-tension'}>{t.aspects[x.type]}</span>
                        <span className="sym">{POINT_GLYPH[x.b]}</span><span>{t.points[x.b]}</span>
                        <span className="orb">{t.result.orb} {x.orb.toFixed(1)}°</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </>
          )}

          <section className="card save">
            <h2>{t.result.save}</h2>
            <p>{t.rel.saveText}</p>
            <a className="btn" href={waitlistUrl}>{t.result.saveCta}</a>
          </section>
        </div>
      )}
    </>
  );
}
