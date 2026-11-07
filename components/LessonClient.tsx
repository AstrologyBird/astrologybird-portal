'use client';

import { useState } from 'react';
import { localePath, type Dictionary, type Locale } from '../lib/i18n';
import { cardById, type LessonView } from '../lib/learn';
import { SHADOW_PROMPTS } from '../lib/shadow-prompts';
import { Face } from './LearnHome';

export default function LessonClient({ lang, t, lesson, done: wasDone, fronts, blacklights }: { lang: Locale; t: Dictionary; lesson: LessonView; done: boolean; fronts: string[]; blacklights: string[] }) {
  const [done, setDone] = useState(wasDone);
  const [open, setOpen] = useState<string[]>(fronts);
  const [bl, setBl] = useState<string[]>(blacklights);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setBusy(true); setError(null);
    const r = await fetch('/api/learn/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lesson: lesson.id }) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) { setError(t.learn.error); return; }
    setDone(true);
    setOpen([...new Set([...open, ...lesson.cards])]);
  }

  async function shadow(card: string) {
    const answer = (answers[card] ?? '').trim();
    if (!answer) return;
    setBusy(true); setError(null);
    const r = await fetch('/api/learn/shadow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ card, answer, lesson: lesson.id }) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) { setError(t.learn.error); return; }
    setBl([...bl, card]);
  }

  // After finishing, offer the shadow question for each card of this lesson that is still on its front.
  const shadowCards = done ? lesson.cards.filter((c) => !bl.includes(c) && !skipped.includes(c)) : [];

  return (
    <div className="lesson">
      <div className="card"><p style={{ margin: 0 }}>{lesson.intro}</p></div>

      {lesson.sections.map((s, i) => (
        <section key={i} className="card lesson-section">
          <h3>{s.heading}</h3>
          {s.lines.map((l, j) => <p key={j}>{l}</p>)}
        </section>
      ))}

      <section className="card">
        <h3 style={{ color: 'var(--gold)', marginBottom: 12 }}>{t.learn.unlocks}</h3>
        {lesson.cards.length ? (
          <div className="unlock-row">
            {lesson.cards.flatMap((c) => [
              <Face key={`${c}-f`} id={c} side="front" open={open.includes(c)} t={t} lang={lang} />,
              <Face key={`${c}-b`} id={c} side="blacklight" open={bl.includes(c)} t={t} lang={lang} />,
            ])}
          </div>
        ) : <p className="hint">{t.learn.unlocksNone}</p>}
      </section>

      {lesson.question && (
        <section className="card">
          <div className="eyebrow">{t.learn.sit}</div>
          <p className="shadow-q">{lesson.question}</p>
        </section>
      )}

      {!done ? (
        <div className="row-actions">
          <button type="button" className="btn" disabled={busy} onClick={complete}>{t.learn.complete}</button>
          <a className="linkish" href={localePath(lang, '/learn')}>{t.learn.back}</a>
        </div>
      ) : (
        <p className="notice">{t.learn.completed}</p>
      )}

      {shadowCards.map((c) => (
        <section key={c} className="card shadow">
          <div className="eyebrow">{t.learn.shadowTitle} · {cardById(c)![lang].name}</div>
          <p className="shadow-q">{SHADOW_PROMPTS[c][lang]}</p>
          <p className="hint" style={{ margin: '0 0 10px' }}>{t.learn.shadowLead}</p>
          <textarea maxLength={4000} placeholder={t.learn.shadowPlaceholder} value={answers[c] ?? ''} onChange={(e) => setAnswers({ ...answers, [c]: e.target.value })} />
          <div className="row-actions" style={{ marginTop: 10 }}>
            <button type="button" className="btn btn-small" disabled={busy || !(answers[c] ?? '').trim()} onClick={() => shadow(c)}>{t.learn.shadowSave}</button>
            <button type="button" className="linkish" onClick={() => setSkipped([...skipped, c])}>{t.learn.skip}</button>
          </div>
        </section>
      ))}
      {done && bl.some((c) => lesson.cards.includes(c)) && <p className="hint">{t.learn.shadowSaved}</p>}
      {done && <a className="btn btn-ghost" href={localePath(lang, '/learn')}>{t.learn.back}</a>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
