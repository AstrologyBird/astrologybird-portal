'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../lib/supabase/browser';
import { localePath, type Dictionary, type Locale } from '../lib/i18n';
import { PENDING_KEY, inputFromProfile, personColumns, placeFromRow, placeLabel, type BirthInput, type PersonRow, type ProfileRow } from '../lib/people';
import PlaceSearch from './PlaceSearch';

const emptyInput: BirthInput = { name: '', date: '', time: '', timeUnknown: false, place: null };

function BirthFields({ value, set, lang, t, nameLabel, extra }: { value: BirthInput; set: (v: BirthInput) => void; lang: Locale; t: Dictionary; nameLabel: string; extra?: React.ReactNode }) {
  return (
    <>
      <label>
        {nameLabel}
        <input value={value.name} maxLength={60} onChange={(e) => set({ ...value, name: e.target.value })} />
      </label>
      {extra}
      <div className="form-row">
        <label>
          {t.form.date}
          <input type="date" required min="1800-01-01" max="2399-12-31" value={value.date} onChange={(e) => set({ ...value, date: e.target.value })} />
        </label>
        <label>
          {t.form.time}
          <input type="time" required={!value.timeUnknown} disabled={value.timeUnknown} value={value.time} onChange={(e) => set({ ...value, time: e.target.value })} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={value.timeUnknown} onChange={(e) => set({ ...value, timeUnknown: e.target.checked })} />
        {t.form.timeUnknown}
      </label>
      <PlaceSearch lang={lang} t={t} value={value.place} onChange={(place) => set({ ...value, place })} />
    </>
  );
}

export default function AccountClient({ lang, t, userId, initialProfile, initialPeople }: { lang: Locale; t: Dictionary; userId: string; initialProfile: ProfileRow; initialPeople: PersonRow[] }) {
  const sb = supabaseBrowser();
  const [profile, setProfile] = useState<BirthInput>(inputFromProfile(initialProfile) ?? { ...emptyInput, name: initialProfile.display_name ?? '' });
  const [locale, setLocale] = useState<Locale>(initialProfile.locale);
  const [digest, setDigest] = useState(initialProfile.digest_opt_in);
  const [hasProfile, setHasProfile] = useState(Boolean(initialProfile.birth_date));
  const [profileState, setProfileState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [people, setPeople] = useState<PersonRow[]>(initialPeople);
  const [draft, setDraft] = useState<BirthInput>(emptyInput);
  const [relation, setRelation] = useState('');
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A guest pressed "save" before signing in: store that chart now.
  useEffect(() => {
    let pending: BirthInput[] | null = null;
    try { pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? 'null'); } catch { /* ignore */ }
    if (!pending?.length) return;
    try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
    (async () => {
      const valid = pending.filter((p) => p.date && p.place);
      if (!valid.length) return;
      const { data, error: err } = await sb.from('people').insert(valid.map((p) => ({ owner_id: userId, ...personColumns(p) }))).select('*');
      if (!err && data) { setPeople((list) => [...list, ...(data as PersonRow[])]); setNotice(t.acct.savedPending); }
    })();
  }, [sb, userId, t.acct.savedPending]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile.date && !profile.place) { setError(t.form.errorPlace); return; }
    setError(null);
    setProfileState('saving');
    const p = profile.place;
    const { error: err } = await sb.from('profiles').update({
      display_name: profile.name.trim() || null, locale, digest_opt_in: digest,
      birth_date: profile.date || null, birth_time: profile.timeUnknown || !profile.time ? null : profile.time, time_unknown: profile.timeUnknown,
      place_name: p ? placeLabel(p) : null, lat: p?.lat ?? null, lon: p?.lon ?? null, timezone: p?.timezone ?? null,
    }).eq('id', userId);
    setProfileState(err ? 'error' : 'saved');
    if (!err) setHasProfile(Boolean(profile.date));
  };

  const addPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.place) { setError(t.form.errorPlace); return; }
    setError(null);
    const { data, error: err } = await sb.from('people').insert({ owner_id: userId, ...personColumns(draft), relation: relation.trim() || null }).select('*').single();
    if (err || !data) { setError(t.form.errorGeneric); return; }
    setPeople((list) => [...list, data as PersonRow]);
    setDraft(emptyInput);
    setRelation('');
    setAdding(false);
  };

  const removePerson = async (p: PersonRow) => {
    if (!window.confirm(t.acct.confirmRemove.replace('{name}', p.name))) return;
    const { error: err } = await sb.from('people').delete().eq('id', p.id);
    if (!err) setPeople((list) => list.filter((x) => x.id !== p.id));
  };

  return (
    <div className="result" style={{ paddingTop: 12 }}>
      {notice && <div className="notice" role="status">{notice}</div>}
      {error && <p className="error" role="alert" style={{ textAlign: 'center' }}>{error}</p>}

      <form className="card form" style={{ maxWidth: 'none', margin: 0 }} onSubmit={saveProfile}>
        <h2 style={{ marginBottom: 0 }}>{t.acct.profileTitle}</h2>
        <p className="hint" style={{ margin: 0 }}>{t.acct.profileLead}</p>
        <BirthFields value={profile} set={(v) => { setProfile(v); setProfileState('idle'); }} lang={lang} t={t} nameLabel={t.acct.displayName} />
        <div className="form-row">
          <label>
            {t.acct.language}
            <select value={locale} onChange={(e) => { setLocale(e.target.value as Locale); setProfileState('idle'); }}>
              <option value="en">English</option>
              <option value="nl">Nederlands</option>
            </select>
          </label>
          <div />
        </div>
        <label className="check">
          <input type="checkbox" checked={digest} onChange={(e) => { setDigest(e.target.checked); setProfileState('idle'); }} />
          {t.acct.digestLabel}
        </label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn" type="submit" disabled={profileState === 'saving'}>
            {profileState === 'saving' ? t.acct.saving : profileState === 'saved' ? `✓ ${t.acct.saved}` : t.acct.save}
          </button>
          {hasProfile && <a className="btn btn-ghost" href={`${localePath(lang)}?me=1`}>{t.acct.myChart}</a>}
          {hasProfile && <a className="btn btn-ghost" href={localePath(lang, '/bird')}>✦ {t.bird.nav}</a>}
          {profileState === 'error' && <span className="error">{t.form.errorGeneric}</span>}
        </div>
      </form>

      <section className="card" style={{ display: 'grid', gap: 14 }}>
        <h2 style={{ marginBottom: 0 }}>{t.acct.peopleTitle}</h2>
        <p className="hint" style={{ margin: 0 }}>{t.acct.peopleLead}</p>
        {people.length === 0 && <p style={{ margin: 0, color: 'var(--muted)' }}>{t.acct.peopleEmpty}</p>}
        <ul className="people-list">
          {people.map((p) => (
            <li key={p.id}>
              <div>
                <strong>{p.name}</strong>{p.relation && <span className="hint"> · {p.relation}</span>}
                <div className="hint">{p.birth_date}{p.birth_time ? ` ${p.birth_time.slice(0, 5)}` : ''} · {placeFromRow(p)?.name}</div>
              </div>
              <div className="people-actions">
                <a className="btn btn-small btn-ghost" href={`${localePath(lang)}?person=${p.id}`}>{t.acct.openChart}</a>
                {hasProfile
                  ? <a className="btn btn-small btn-ghost" href={`${localePath(lang, '/relationship')}?a=me&b=${p.id}`}>{t.acct.compare}</a>
                  : <span className="hint" title={t.acct.needProfile}>{t.acct.compare}</span>}
                <button type="button" className="linkish" onClick={() => removePerson(p)}>{t.acct.remove}</button>
              </div>
            </li>
          ))}
        </ul>
        {adding ? (
          <form className="form" style={{ maxWidth: 'none', margin: 0 }} onSubmit={addPerson}>
            <BirthFields value={draft} set={setDraft} lang={lang} t={t} nameLabel={t.form.name.replace(/ \(.*\)/, '')}
              extra={<label>{t.acct.relation}<input value={relation} maxLength={40} placeholder={t.acct.relationPlaceholder} onChange={(e) => setRelation(e.target.value)} /></label>} />
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn" type="submit">{t.acct.save}</button>
              <button className="btn btn-ghost" type="button" onClick={() => setAdding(false)}>×</button>
            </div>
          </form>
        ) : (
          <div><button className="btn btn-ghost" type="button" onClick={() => setAdding(true)}>+ {t.acct.addPerson}</button></div>
        )}
      </section>

      <form method="post" action={`/auth/signout?lang=${lang}`} style={{ textAlign: 'center' }}>
        <button className="linkish" type="submit">{t.acct.signOut}</button>
      </form>
    </div>
  );
}
