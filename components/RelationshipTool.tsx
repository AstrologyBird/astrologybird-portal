'use client';

import { useEffect, useRef, useState } from 'react';
import type { Chart, Place, Position, Relationship } from '../lib/chart-types';
import type { Dictionary, Locale } from '../lib/i18n';
import { POINT_GLYPH, SIGN_GLYPH } from '../lib/glyphs';
import { listSaved } from '../lib/saved';
import { inputFromPerson, personColumns, PENDING_KEY, type BirthInput } from '../lib/people';
import { localePath } from '../lib/i18n';
import { ACCOUNTS_OPEN } from '../lib/supabase/config';
import { supabaseBrowser } from '../lib/supabase/browser';
import PlaceSearch from './PlaceSearch';
import ChartWheel from './ChartWheel';

const STORAGE_KEY = 'astrologybird:last-relationship-input';
const HARMONY = new Set(['trine', 'sextile']);
const MAJOR = new Set(['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);

type Person = { name: string; date: string; time: string; timeUnknown: boolean; place: Place | null };
const empty: Person = { name: '', date: '', time: '', timeUnknown: false, place: null };

const fmt = (p: Position) => `${p.degree}°${String(p.minute).padStart(2, '0')}′`;
const fill = (s: string, a: string, b: string) => s.replace('{a}', a).replace('{b}', b);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Saved = { key: string; label: string; input: BirthInput };

type Seat = { kicker: string; namePlaceholder: string; timeUnknown: string };

function PersonFields({ title, seat, p, set, lang, t, saved }: { title: string; seat: Seat; p: Person; set: (p: Person) => void; lang: Locale; t: Dictionary; saved: Saved[] }) {
  return (
    <fieldset className="seat">
      <legend className="seat-head">
        <span className="seat-num" aria-hidden="true">{seat.kicker}</span>
        <span className="seat-title">{title}</span>
      </legend>
      {saved.length > 0 && (
        <label>
          {t.acct.choosePerson}
          <select value="" onChange={(e) => { const s = saved.find((x) => x.key === e.target.value); if (s) set({ ...s.input }); }}>
            <option value="">…</option>
            {saved.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
      )}
      <label className="seat-name">
        <span className="vh">{t.form.name}</span>
        <input value={p.name} maxLength={40} placeholder={seat.namePlaceholder} onChange={(e) => set({ ...p, name: e.target.value })} />
        <small>{t.rel.optional}</small>
      </label>
      <div className="form-row">
        <label>
          {t.rel.bornOn}
          <input type="date" required min="1800-01-01" max="2399-12-31" value={p.date} onChange={(e) => set({ ...p, date: e.target.value })} />
        </label>
        <label>
          {t.rel.bornAt}
          <input type="time" required={!p.timeUnknown} disabled={p.timeUnknown} value={p.time} onChange={(e) => set({ ...p, time: e.target.value })} />
        </label>
      </div>
      <label className="check seat-check">
        <input type="checkbox" checked={p.timeUnknown} onChange={(e) => set({ ...p, timeUnknown: e.target.checked })} />
        {seat.timeUnknown}
      </label>
      <PlaceSearch lang={lang} t={t} label={t.rel.bornIn} value={p.place} onChange={(place) => set({ ...p, place })} />
    </fieldset>
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
  const [tab, setTab] = useState<'synastry' | 'composite' | 'a' | 'b'>('synastry');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [autoRun, setAutoRun] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) { const s = JSON.parse(stored); if (s.a) setA(s.a); if (s.b) setB(s.b); }
    } catch { /* storage unavailable */ }
    // Signed in: offer saved people, and fill ?a=me&b=<id> from the account.
    listSaved().then((list) => {
      if (!list) return;
      setSignedIn(true);
      const options: Saved[] = [
        ...(list.me ? [{ key: 'me', label: `${t.acct.me}${list.me.name ? ` (${list.me.name})` : ''}`, input: list.me }] : []),
        ...list.people.map((r) => ({ key: r.id, label: r.relation ? `${r.name} · ${r.relation}` : r.name, input: inputFromPerson(r) })),
      ];
      setSaved(options);
      const params = new URLSearchParams(window.location.search);
      const pa = options.find((o) => o.key === params.get('a'));
      const pb = options.find((o) => o.key === params.get('b'));
      if (pa) setA({ ...pa.input });
      if (pb) setB({ ...pb.input });
      if (pa && pb) setAutoRun(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nameA = a.name.trim() || t.rel.personA;
  const nameB = b.name.trim() || t.rel.personB;
  // Possessive forms: "your" / "their" / "Luna's" (NL: "jou" / "de ander" / "Luna").
  const possA = a.name.trim() ? t.rel.possName.replace('{n}', a.name.trim()) : t.rel.possYou;
  const possB = b.name.trim() ? t.rel.possName.replace('{n}', b.name.trim()) : t.rel.possThem;

  const saveBoth = async () => {
    // Skip people that are already in the account (picked from the saved list).
    const known = new Set(saved.map((s) => `${s.input.date}|${s.input.name}`));
    const fresh = [a, b].filter((p) => p.date && p.place && !known.has(`${p.date}|${p.name}`));
    const sb = supabaseBrowser();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      try { localStorage.setItem(PENDING_KEY, JSON.stringify(fresh)); } catch { /* ignore */ }
      window.location.href = `${localePath(lang, '/login')}?next=${encodeURIComponent(localePath(lang, '/account'))}`;
      return;
    }
    setSaveState('saving');
    const { error: err } = fresh.length ? await sb.from('people').insert(fresh.map((p) => ({ owner_id: session.user.id, ...personColumns(p) }))) : { error: null };
    setSaveState(err ? 'idle' : 'saved');
    if (err) setError(t.form.errorGeneric);
  };

  useEffect(() => {
    if (autoRun && a.place && b.place) { setAutoRun(false); run(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, a, b]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await run();
  };

  const run = async () => {
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
  // Tightest aspect between the classic planets (no angles or minor bodies).
  const strongest = syn ? [...syn.aspects].filter((x) => MAJOR.has(x.a) && MAJOR.has(x.b)).sort((x, y) => x.orb - y.orb)[0] ?? null : null;

  return (
    <>
      <form onSubmit={submit}>
        <div className="person-grid">
          <PersonFields title={t.rel.personA} seat={t.rel.you} p={a} set={setA} lang={lang} t={t} saved={saved} />
          <div className="pair-knot" aria-hidden="true"><span>&amp;</span></div>
          <PersonFields title={t.rel.personB} seat={t.rel.them} p={b} set={setB} lang={lang} t={t} saved={saved} />
        </div>
        <div className="submit-row">
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-big" type="submit" disabled={busy}><span aria-hidden="true">✦</span>{busy ? t.form.calculating : t.rel.submit}</button>
        </div>
      </form>

      {result && syn && counts && composite && (
        <div className="result" ref={resultRef}>
          <div className="result-head">
            <h2>{nameA} &amp; {nameB}</h2>
          </div>

          <div className="tabs" role="tablist">
            {(['synastry', 'composite', 'a', 'b'] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={`btn btn-small ${tab === k ? '' : 'btn-ghost'}`} onClick={() => setTab(k)}>
                {k === 'synastry' ? t.rel.tabSynastry : k === 'composite' ? t.rel.tabComposite : k === 'a' ? nameA : nameB}
              </button>
            ))}
          </div>

          {(tab === 'a' || tab === 'b') && (() => {
            const solo = tab === 'a' ? result.a : result.b;
            const who = tab === 'a' ? nameA : nameB;
            return (
              <>
                <p className="lead" style={{ textAlign: 'center' }}>{t.rel.soloIntro}</p>
                <section className="bigthree">
                  {([['sun', t.result.sun, t.result.sunText], ['moon', t.result.moon, t.result.moonText], ['rising', t.result.rising, t.result.risingText]] as const).map(([k, label, meaning]) => {
                    const sign = solo.bigThree[k];
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
                <div className="card wheel-wrap"><ChartWheel chart={solo} t={t} ariaLabel={who} /></div>
              </>
            );
          })()}

          {tab === 'synastry' && (
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

              {strongest && (
                <section className="thread">
                  <div className="eyebrow">{t.rel.strongestTitle}</div>
                  <p className="thread-line">
                    <span className="sym">{POINT_GLYPH[strongest.a]}</span> {t.points[strongest.a]} <small>({nameA})</small>
                    {' '}<em className={strongest.type === 'conjunction' ? 'type-neutral' : HARMONY.has(strongest.type) ? 'type-harmony' : 'type-tension'}>{t.aspects[strongest.type]}</em>{' '}
                    <span className="sym" style={{ color: '#c9a7f0' }}>{POINT_GLYPH[strongest.b]}</span> {t.points[strongest.b]} <small>({nameB})</small>
                  </p>
                  <p className="thread-meaning">{t.rel.aspectMeaning[strongest.type]}</p>
                </section>
              )}

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
                {([[syn.aInB, result.a, possA, possB], [syn.bInA, result.b, possB, possA]] as const).map(([list, chart, who, other]) => (
                  <section className="card" key={who}>
                    <h3 style={{ marginBottom: 10 }}>{cap(fill(t.rel.overlays, who, other))}</h3>
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
                    ) : <p className="hint" style={{ margin: 0 }}>{cap(fill(t.rel.overlayNeedsTime, who, other))}</p>}
                  </section>
                ))}
              </div>
            </>
          )}

          {tab === 'composite' && (
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

          <section className="keep">
            <div className="keep-copy">
              <div className="eyebrow">AstrologyBird</div>
              <h2>{t.rel.saveTitle}</h2>
              <p>{t.rel.saveLead}</p>
              <div className="save-actions">
                {saveState === 'saved' ? (
                  <>
                    <span role="status">✓ {t.rel.savedBoth}</span>
                    <a className="btn btn-ghost" href={localePath(lang, '/constellation')}>{t.rel.openConstellation}</a>
                  </>
                ) : signedIn || ACCOUNTS_OPEN ? (
                  <button className="btn btn-big" type="button" onClick={saveBoth} disabled={saveState === 'saving'}>
                    {saveState === 'saving' ? t.acct.saving : t.rel.saveBoth}
                  </button>
                ) : (
                  <a className="btn btn-big" href={waitlistUrl}>{t.result.saveCta}</a>
                )}
              </div>
            </div>
            <ul className="keep-perks">
              {t.rel.perks.map((perk) => <li key={perk}><span aria-hidden="true">✦</span>{perk}</li>)}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
