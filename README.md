# Astrologybird portal

The account portal for **app.astrologybird.com**. The marketing site stays on Framer
(astrologybird.com); this app is where visitors calculate charts and, later, keep
their account, saved charts, daily digest, readings and After Dark videos.

English lives at `/`, Dutch at `/nl`.

## What is here (phase 1)

- Free birth chart without an account: date, time (or "unknown"), place search,
  Placidus or Whole Sign houses.
- Chart wheel, Big Three, positions, aspects, elements/modalities, house cusps.
- The last input is remembered in the visitor's own browser only.

## Structure

| Folder | What |
| --- | --- |
| `app/` | Next.js pages (`[lang]`) and API routes that forward to the chart engine |
| `components/` | Form, place search, chart wheel |
| `lib/` | Translations (EN/NL), types, glyphs |
| `chart-engine/` | Separate calculation service (Swiss Ephemeris, **AGPL-3.0**) |

The chart engine is deliberately a separate service with its own licence. Because the
Swiss Ephemeris is used under the AGPL, the engine's source code must be available to
users; it will move to its own public repository. The portal only talks to it over HTTP.

## Run locally

```bash
npm install && npm --prefix chart-engine install
npm run engine            # http://localhost:8787
cp .env.example .env.local
npm run dev               # http://localhost:3000 and /nl
npm run test:engine
```

## Environment

See `.env.example`. `CHART_ENGINE_URL` points to the engine; `NEXT_PUBLIC_WAITLIST_URL`
is where "Create your free account" goes until accounts exist (phase 3, Supabase).
