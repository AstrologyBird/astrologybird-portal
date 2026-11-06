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

Calculations come from the separate, public
[astrologybird-chart-engine](https://github.com/AstrologyBird/astrologybird-chart-engine)
(Swiss Ephemeris, AGPL-3.0). The portal only talks to it over HTTP, so this repository stays private.

## Run locally

```bash
git clone https://github.com/AstrologyBird/astrologybird-chart-engine ../astrologybird-chart-engine
npm install && npm --prefix ../astrologybird-chart-engine install
npm run engine            # http://localhost:8787
cp .env.example .env.local
npm run dev               # http://localhost:3000 and /nl
npm run test:engine
```

## Environment

See `.env.example`. `CHART_ENGINE_URL` points to the engine; `NEXT_PUBLIC_WAITLIST_URL`
is where "Create your free account" goes until accounts exist (phase 3, Supabase).
