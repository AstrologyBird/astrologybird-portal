'use client';

import { useEffect, useRef, useState } from 'react';
import type { Chart, Place, Position } from '../lib/chart-types';
import type { Dictionary, Locale } from '../lib/i18n';
import { POINT_GLYPH, SIGN_GLYPH } from '../lib/glyphs';
import { localePath } from '../lib/i18n';
import { PENDING_KEY, personColumns } from '../lib/people';
import { loadSaved } from '../lib/saved';
import { supabaseBrowser } from '../lib/supabase/browser';
import { ACCOUNTS_OPEN } from '../lib/supabase/config';
import PlaceSearch from './PlaceSearch';
import ChartWheel from './ChartWheel';

const STORAGE_KEY = 'astrologybird:last-chart-input';
const HARMONY = new Set(['trine', 'sextile']);

type FormState = { name: string; date: string; time: string; timeUnknown: boolean; place: Place | null; houseSystem: 'placidus' | 'wholeSign' };

const fmtDeg = (p: Position) => `${p.degree}°${String(p.minute).padStart(2, '0')}′`;

export default function BirthChartTool({ lang, t, waitlistUrl, sourceUrl }: { lang: Locale; t: Dictionary; waitlistUrl: string; sourceUrl: string | null }) {
  const [form, setForm] = useState<FormState>({ name: '', date: '', time: '', timeUnknown: false, place: null, houseSystem: 'placidus' });
  const [chart, setChart] = useState<Chart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [fromAccount, setFromAccount] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabaseBrowser().auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  useEffect(() => {
    // ?me=1 or ?person=<id>: open a chart saved in the account.
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('me') ? 'me' : params.get('person');
    if (ref) {
      loadSaved(ref).then(async (input) => {
        if (!input?.place) return;
        const next = { ...form, ...input };
        setForm(next);
        setFromAccount(true);
        try { setChart(await calculate(next)); } catch { setError(t.form.errorGeneric); }
      });
      return;
    }
    // Guests keep their last input in this browser only (nothing is stored on a server).
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setForm((f) => ({ ...f, ...JSON.parse(saved) }));
    } catch { /* storage unavailable */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveToAccount = async () => {
    if (!form.place) return;
    const sb = supabaseBrowser();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      // Remember the chart, sign in, and the account page stores it.
      try { localStorage.setItem(PENDING_KEY, JSON.stringify([form])); } catch { /* ignore */ }
      window.location.href = `${localePath(lang, '/login')}?next=${encodeURIComponent(localePath(lang, '/account'))}`;
      return;
    }
    setSaveState('saving');
    const { error: err } = await sb.from('people').insert({ owner_id: session.user.id, ...personColumns(form) });
    setSaveState(err ? 'idle' : 'saved');
    if (err) setError(t.form.errorGeneric);
  };

  const calculate = async (f: FormState) => {
    const res = await fetch('/api/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: f.name || undefined, date: f.date, time: f.timeUnknown ? null : f.time,
        lat: f.place!.lat, lon: f.place!.lon, timezone: f.place!.timezone, houseSystem: f.houseSystem,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'error');
    return data as Chart;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.place) { setError(t.form.errorPlace); return; }
    setBusy(true);
    try {
      const c = await calculate(form);
      setChart(c);
      setSaveState('idle');
      setFromAccount(false);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch { /* ignore */ }
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch {
      setError(t.form.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  const switchHouses = async (houseSystem: FormState['houseSystem']) => {
    const next = { ...form, houseSystem };
    setForm(next);
    if (chart && form.place) {
      try { setChart(await calculate(next)); } catch { setError(t.form.errorGeneric); }
    }
  };

  return (
    <>
      <form className="form card" onSubmit={submit}>
        <label>
          {t.form.name}
          <input value={form.name} maxLength={60} placeholder={t.form.namePlaceholder} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <div className="form-row">
          <label>
            {t.form.date}
            <input type="date" required min="1800-01-01" max="2399-12-31" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label>
            {t.form.time}
            <input type="time" required={!form.timeUnknown} disabled={form.timeUnknown} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={form.timeUnknown} onChange={(e) => setForm({ ...form, timeUnknown: e.target.checked })} />
          {t.form.timeUnknown}
        </label>
        {!form.timeUnknown && <p className="hint">{t.form.timeHint}</p>}
        <PlaceSearch lang={lang} t={t} value={form.place} onChange={(place) => setForm((f) => ({ ...f, place }))} />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? t.form.calculating : t.form.submit}</button>
      </form>

      {chart && (
        <div className="result" ref={resultRef}>
          <div className="result-head">
            <h2>{chart.name ?? t.result.bigThree}</h2>
            <p>
              {t.result.calculatedFor} {form.place?.name}, {chart.input.date}{chart.input.time ? ` ${chart.input.time}` : ''} ·{' '}
              {String(chart.utc.hour).padStart(2, '0')}:{String(chart.utc.minute).padStart(2, '0')} {t.result.utc} ({chart.utc.abbreviation})
            </p>
          </div>

          {chart.warnings.filter((w) => w !== 'time-unknown').map((w) => (
            <div className="notice" key={w}>
              {w === 'nonexistent-local-time' ? t.result.warnNonexistent : w === 'ambiguous-local-time' ? t.result.warnAmbiguous : t.result.warnFallback}
            </div>
          ))}

          <section className="bigthree" aria-label={t.result.bigThree}>
            <BigCard label={t.result.sun} meaning={t.result.sunText} sign={chart.bigThree.sun} t={t} />
            <BigCard label={t.result.moon} meaning={t.result.moonText} sign={chart.bigThree.moon} t={t} note={chart.moonSignUncertain ? t.result.moonUncertain : undefined} />
            {chart.bigThree.rising
              ? <BigCard label={t.result.rising} meaning={t.result.risingText} sign={chart.bigThree.rising} t={t} />
              : <div className="card big"><div className="label">{t.result.rising}</div><div className="meaning" style={{ marginTop: 24 }}>{t.result.risingUnknown}</div></div>}
          </section>

          <div className="card wheel-wrap"><ChartWheel chart={chart} t={t} /></div>

          {chart.timeKnown && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>{t.form.houseSystem}:</span>
              {(['placidus', 'wholeSign'] as const).map((h) => (
                <button key={h} type="button" className={`btn btn-small ${form.houseSystem === h ? '' : 'btn-ghost'}`} onClick={() => switchHouses(h)}>
                  {t.form[h]}
                </button>
              ))}
            </div>
          )}

          <div className="grid-2">
            <section className="card">
              <h3 style={{ marginBottom: 10 }}>{t.result.positions}</h3>
              <table>
                <thead><tr><th /><th /><th /><th className="num">°</th>{chart.timeKnown && <th>{t.result.house}</th>}</tr></thead>
                <tbody>
                  {[...chart.points, ...(chart.angles ? [chart.angles.asc, chart.angles.mc] : [])].map((p) => (
                    <tr key={p.key}>
                      <td className="sym">{POINT_GLYPH[p.key].length > 1 && !/[☀-⛿]/.test(POINT_GLYPH[p.key]) ? '' : POINT_GLYPH[p.key]}</td>
                      <td>{t.points[p.key]}{p.retrograde && <span className="retro" title={t.result.retrograde}>R</span>}</td>
                      <td><span className="sym" style={{ fontFamily: 'var(--symbol)', color: 'var(--gold)' }}>{SIGN_GLYPH[p.sign]}</span> {t.signs[p.sign]}</td>
                      <td className="num">{fmtDeg(p)}</td>
                      {chart.timeKnown && <td className="num">{p.house ?? ''}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="card">
              <h3 style={{ marginBottom: 10 }}>{t.result.aspects}</h3>
              <ul className="aspects">
                {chart.aspects.map((a, i) => (
                  <li key={i}>
                    <span className="sym">{POINT_GLYPH[a.a]}</span>
                    <span>{t.points[a.a]}</span>
                    <span className={a.type === 'conjunction' ? 'type-neutral' : HARMONY.has(a.type) ? 'type-harmony' : 'type-tension'}>{t.aspects[a.type]}</span>
                    <span className="sym">{POINT_GLYPH[a.b]}</span>
                    <span>{t.points[a.b]}</span>
                    <span className="orb">{t.result.orb} {a.orb.toFixed(1)}° · {a.applying ? t.result.applying : t.result.separating}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="grid-2">
            <section className="card">
              <h3 style={{ marginBottom: 12 }}>{t.result.elements}</h3>
              <Bars values={chart.elements} labels={t.elements} />
            </section>
            <section className="card">
              <h3 style={{ marginBottom: 12 }}>{t.result.modalities}</h3>
              <Bars values={chart.modalities} labels={t.modalities} />
            </section>
          </div>

          {chart.timeKnown && chart.houses && (
            <section className="card">
              <h3 style={{ marginBottom: 10 }}>{t.result.houses}</h3>
              <table>
                <tbody>
                  {[0, 1, 2].map((row) => (
                    <tr key={row}>
                      {chart.houses!.slice(row * 4, row * 4 + 4).map((h) => (
                        <td key={h.house} className="num">
                          <span style={{ color: 'var(--quiet)' }}>{h.house}</span>{' '}
                          <span style={{ fontFamily: 'var(--symbol)', color: 'var(--gold)' }}>{SIGN_GLYPH[h.sign]}</span> {fmtDeg(h)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {!fromAccount && (
            <section className="card save">
              <h2>{t.result.save}</h2>
              <p>{signedIn ? t.result.saveTextSignedIn : t.result.saveText}</p>
              <div className="save-actions">
                {saveState === 'saved' ? (
                  <>
                    <span role="status">✓ {t.acct.savedToAccount}</span>
                    <a className="btn btn-ghost" href={localePath(lang, '/account')}>{t.acct.viewAccount}</a>
                  </>
                ) : signedIn || ACCOUNTS_OPEN ? (
                  <button className="btn" type="button" onClick={saveToAccount} disabled={saveState === 'saving'}>
                    {saveState === 'saving' ? t.acct.saving : t.acct.saveToAccount}
                  </button>
                ) : (
                  <a className="btn" href={waitlistUrl}>{t.result.saveCta}</a>
                )}
              </div>
            </section>
          )}

          <p style={{ textAlign: 'center', color: 'var(--quiet)', fontSize: 12, margin: 0 }}>
            {t.result.engine}{sourceUrl && <> <a href={sourceUrl}>{t.result.source}</a> (AGPL-3.0)</>}
          </p>
        </div>
      )}
    </>
  );
}

function BigCard({ label, meaning, sign, t, note }: { label: string; meaning: string; sign: Chart['bigThree']['sun']; t: Dictionary; note?: string }) {
  return (
    <div className="card big">
      <div className="label">{label}</div>
      <div className="glyph" aria-hidden="true">{SIGN_GLYPH[sign]}</div>
      <div className="sign">{t.signs[sign]}</div>
      <div className="meaning">{meaning}</div>
      <div className="kw">{t.signKeywords[sign]}</div>
      {note && <div className="hint" style={{ marginTop: 8 }}>{note}</div>}
    </div>
  );
}

function Bars<K extends string>({ values, labels }: { values: Record<K, number>; labels: Record<K, string> }) {
  const max = Math.max(1, ...Object.values<number>(values));
  return (
    <div className="bars">
      {(Object.keys(values) as K[]).map((k) => (
        <div className="bar" key={k}>
          <span>{labels[k]}</span>
          <span className="track"><span className="fill" style={{ width: `${(values[k] / max) * 100}%` }} /></span>
          <span className="num">{values[k]}</span>
        </div>
      ))}
    </div>
  );
}
