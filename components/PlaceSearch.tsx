'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Place } from '../lib/chart-types';
import type { Dictionary, Locale } from '../lib/i18n';
import { placeLabel } from '../lib/people';

export default function PlaceSearch({ lang, t, value, onChange }: { lang: Locale; t: Dictionary; value: Place | null; onChange: (p: Place | null) => void }) {
  const [query, setQuery] = useState(value ? placeLabel(value) : '');
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searched, setSearched] = useState(false);
  const listId = useId();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (value && query === placeLabel(value)) return;
    if (query.trim().length < 2) { setResults([]); setSearched(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(query)}&lang=${lang}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setActive(0);
        setOpen(true);
        setSearched(true);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(timer.current);
  }, [query, lang, value]);

  useEffect(() => {
    if (value) setQuery(placeLabel(value));
  }, [value]);

  const choose = (p: Place) => {
    onChange(p);
    setQuery(placeLabel(p));
    setOpen(false);
  };

  return (
    <label className="places">
      {t.form.place}
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={t.form.placePlaceholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(null); }}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || !results.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === 'Enter') { e.preventDefault(); choose(results[active]); }
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && (
        <ul id={listId} role="listbox">
          {results.length === 0 && searched && <li aria-disabled="true">{t.form.placeNone}</li>}
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active} onMouseDown={() => choose(p)}>
              {p.name}
              <small>{p.countryName}</small>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}
