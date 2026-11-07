'use client';

import { useState } from 'react';
import { localePath, type Dictionary, type Locale } from '../lib/i18n';
import { CARDS, FREE_LEVELS, LESSONS, LEVEL_NAMES, TOTAL_FACES, cardById } from '../lib/learn';
import type { Unlock } from '../lib/learn-server';

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((acc, [k, x]) => acc.replaceAll(`{${k}}`, String(x)), s);

export interface LearnData { done: string[]; unlocks: Unlock[]; member: boolean; streak: number; titles: Record<string, string> }

export function Face({ id, side, open, t, lang }: { id: string; side: 'front' | 'blacklight'; open: boolean; t: Dictionary; lang: Locale }) {
  const card = cardById(id)!;
  return (
    <div className={`face${open ? '' : ' locked'}${side === 'blacklight' ? ' bl' : ''}`} title={card[lang].name}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/cards/${id}${side === 'blacklight' ? '-blacklight' : ''}.jpg`} alt={card[lang].name} loading="lazy" />
      <span className="seal">{open ? (side === 'blacklight' ? t.learn.blackLight : card[lang].name) : t.learn.lockedFace}</span>
    </div>
  );
}

export default function LearnHome({ lang, t, data }: { lang: Locale; t: Dictionary; data: LearnData }) {
  const has = (id: string, side: 'front' | 'blacklight') => data.unlocks.some((u) => u.card_id === id && u.side === side);
  const faces = data.unlocks.length;
  const fronts = CARDS.filter((c) => has(c.id, 'front'));
  const [drawn, setDrawn] = useState<string | null>(null);
  const card = drawn ? cardById(drawn)! : null;
  const bl = drawn ? has(drawn, 'blacklight') : false;

  return (
    <div className="learn">
      <div className="learn-stats">
        <div className="card learn-stat"><strong>{faces}/{TOTAL_FACES}</strong><span>{fill(t.learn.faces, { n: faces, total: TOTAL_FACES })}</span></div>
        <div className="card learn-stat"><strong>☽ {data.streak}</strong><span>{data.streak ? fill(t.learn.streakText, { n: data.streak }) : t.learn.streakNone}</span></div>
        <div className="card learn-stat"><strong>{data.done.length}/{LESSONS.length}</strong><span>{t.learn.done}</span></div>
      </div>

      <div className="card">
        <div className="row-actions">
          <button type="button" className="btn" disabled={!fronts.length} onClick={() => setDrawn(fronts[Math.floor(Math.random() * fronts.length)].id)}>{t.learn.draw}</button>
          {!fronts.length && <span className="hint">{t.learn.drawEmpty}</span>}
        </div>
        {card && (
          <div className="drawn" style={{ marginTop: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/cards/${card.id}${bl ? '-blacklight' : ''}.jpg`} alt={card[lang].name} />
            <div>
              <div className="eyebrow">{bl ? t.learn.blackLight : card[lang].name}</div>
              <h3>{card[lang].title}</h3>
              <p>{bl ? card[lang].blackLight : card[lang].message}</p>
              <p><em>{card[lang].question}</em></p>
            </div>
          </div>
        )}
      </div>

      <div className="levels">
        {LEVEL_NAMES[lang].map((levelName, i) => {
          const level = i + 1;
          const open = level <= FREE_LEVELS || data.member;
          return (
            <section key={level} className="card">
              <div className="level-head">
                <h3>{fill(t.learn.level, { n: level })} · {levelName}</h3>
                <span className={`badge${open ? '' : ' badge-quiet'}`}>{level <= FREE_LEVELS ? t.learn.free : t.learn.member}</span>
              </div>
              <ul className="lesson-list">
                {LESSONS.filter((l) => l.level === level).map((l) => {
                  const done = data.done.includes(l.id);
                  return (
                    <li key={l.id} className={open ? '' : 'locked'}>
                      {open ? (
                        <a href={localePath(lang, `/learn/${l.id}`)}>
                          <span>{data.titles[l.id]}</span>
                          <span className={`state${done ? ' done' : ''}`}>{done ? `✓ ${t.learn.done}` : t.learn.start}</span>
                        </a>
                      ) : (
                        <span><span>{data.titles[l.id]}</span><span className="state">{t.learn.locked}</span></span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <section className="card">
        <div className="level-head">
          <h3>{t.learn.collection}</h3>
          <span className="hint">{t.learn.certifiedGate}</span>
        </div>
        <div className="deck-grid" style={{ marginTop: 14 }}>
          {CARDS.map((c) => (
            <div key={c.id} className="pair">
              <Face id={c.id} side="front" open={has(c.id, 'front')} t={t} lang={lang} />
              <Face id={c.id} side="blacklight" open={has(c.id, 'blacklight')} t={t} lang={lang} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
