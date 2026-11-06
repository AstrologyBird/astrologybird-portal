'use client';

import { useEffect, useRef, useState } from 'react';
import { localePath, type Dictionary, type Locale } from '../lib/i18n';

interface Msg { role: 'user' | 'assistant'; content: string }
interface CardInfo { id: string; glyph: string; en: { name: string; title: string; question: string }; nl: { name: string; title: string; question: string } }
interface State { messages: Msg[]; member: boolean; remaining: number | null; limit: number; hasProfile: boolean; card: CardInfo | null }

export default function BirdChat({ lang, t, waitlistUrl }: { lang: Locale; t: Dictionary; waitlistUrl: string }) {
  const [state, setState] = useState<State | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/bird').then(async (r) => {
      if (r.status === 401) { setError(t.bird.signin); return; }
      setState(await r.json());
    }).catch(() => setError(t.bird.error));
  }, [t.bird.signin, t.bird.error]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [state?.messages.length, busy]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy || !state) return;
    setError(null);
    setBusy(true);
    setInput('');
    setState((s) => s && { ...s, messages: [...s.messages, { role: 'user', content: q }, { role: 'assistant', content: '' }] });
    try {
      const res = await fetch('/api/bird', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: q }) });
      if (!res.ok || !res.body) {
        const { error: code } = await res.json().catch(() => ({ error: 'x' }));
        setState((s) => s && { ...s, messages: s.messages.slice(0, -2), remaining: code === 'quota' ? 0 : s.remaining });
        if (code !== 'quota') setError(code === 'unavailable' ? t.bird.unavailable : code === 'profile' ? t.bird.needProfile : t.bird.error);
        if (code !== 'quota') setInput(q);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setState((s) => {
          if (!s) return s;
          const msgs = s.messages.slice();
          msgs[msgs.length - 1] = { role: 'assistant', content: msgs[msgs.length - 1].content + chunk };
          return { ...s, messages: msgs };
        });
      }
      setState((s) => s && { ...s, remaining: s.remaining === null ? null : Math.max(0, s.remaining - 1) });
    } catch {
      setError(t.bird.error);
    } finally {
      setBusy(false);
    }
  };

  if (error && !state) return <p className="error" role="alert" style={{ textAlign: 'center' }}>{error}</p>;
  if (!state) return <p className="hint" style={{ textAlign: 'center' }}>{t.bird.thinking}</p>;

  if (!state.hasProfile) {
    return (
      <div className="card bird-empty">
        <p>{t.bird.needProfile}</p>
        <a className="btn" href={localePath(lang, '/account')}>{t.bird.needProfileCta}</a>
      </div>
    );
  }

  const outOfQuestions = !state.member && state.remaining === 0;
  const card = state.card?.[lang];

  return (
    <div className="bird">
      {card && (
        <aside className="bird-card" aria-label={t.bird.cardToday}>
          <span className="bird-card-glyph" aria-hidden="true">{state.card!.glyph || '✦'}</span>
          <div>
            <div className="eyebrow">{t.bird.cardToday}</div>
            <strong>{card.name}</strong> · <em>{card.title}</em>
            <p>{card.question}</p>
          </div>
        </aside>
      )}

      <div className="bird-log" aria-live="polite">
        {state.messages.length === 0 && (
          <div className="bird-suggestions">
            {t.bird.suggestions.map((s) => (
              <button key={s} type="button" className="btn btn-ghost btn-small" disabled={busy || outOfQuestions} onClick={() => ask(s)}>{s}</button>
            ))}
          </div>
        )}
        {state.messages.map((m, i) => (
          <div key={i} className={`bird-msg bird-${m.role}`}>
            <span className="bird-who">{m.role === 'user' ? t.bird.you : t.bird.bird}</span>
            <div className="bird-text">{m.content || (busy && i === state.messages.length - 1 ? <span className="hint">{t.bird.thinking}</span> : null)}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {outOfQuestions ? (
        <div className="card bird-empty">
          <h2>{t.bird.quotaTitle}</h2>
          <p>{t.bird.quotaLead}</p>
          <a className="btn" href={waitlistUrl}>{t.bird.quotaCta}</a>
        </div>
      ) : (
        <form className="bird-form" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
          <textarea
            value={input}
            maxLength={1000}
            rows={2}
            placeholder={t.bird.placeholder}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
          />
          <button className="btn" type="submit" disabled={busy || !input.trim()}>{t.bird.send}</button>
        </form>
      )}
      <p className="hint bird-meta">
        {state.member ? t.bird.unlimited : t.bird.remaining.replace('{n}', String(state.remaining ?? 0)).replace('{limit}', String(state.limit))}
        {' · '}{t.bird.disclaimer}
      </p>
    </div>
  );
}
