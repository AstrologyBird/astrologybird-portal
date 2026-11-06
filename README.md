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

## Accounts (phase 3)

Supabase (project `bjcseowrzyhylhjtozih`, EU) handles sign-in by e-mail link and stores
`profiles` (own birth data, language, digest opt-in) and `people` (saved partners, family,
friends). Row Level Security lets each account read and change only its own rows. The schema
is in `supabase/migrations/`.

- `/login` sends the magic link, `/auth/callback` signs the user in, `/account` shows the profile and people.
- "Save to my account" on a chart stores the person; guests are sent to sign in first and the chart is saved afterwards.
- `/?me=1`, `/?person=<id>` and `/relationship?a=me&b=<id>` open saved charts.
- `NEXT_PUBLIC_ACCOUNTS_OPEN=true` switches the sign-up buttons from the waitlist to `/login`.
  Keep it off in production until a custom SMTP sender is set in Supabase (the built-in
  sender only mails project members and is rate limited).

Supabase settings (Authentication → URL Configuration): Site URL `https://app.astrologybird.com`;
redirect URLs `https://app.astrologybird.com/**`, `https://*-astrology-bird.vercel.app/**`, `http://localhost:3000/**`.
