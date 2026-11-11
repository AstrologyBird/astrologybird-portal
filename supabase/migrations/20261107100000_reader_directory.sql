-- Reader directory (Your Constellation needs no new tables).
-- Applied to project bjcseowrzyhylhjtozih on 2026-11-11.

-- ---------------------------------------------------------------------------
-- Reader directory (marketplace phase 1: profiles link out, no payments yet)
-- ---------------------------------------------------------------------------

-- Applications come in through the server (service role). Nobody reads them from the browser.
create table public.reader_applications (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 200),
  website text check (char_length(website) <= 300),
  instagram text check (char_length(instagram) <= 100),
  modalities text[] not null default '{}',
  languages text[] not null default '{}',
  about text check (char_length(about) <= 2000),
  sample_reading_url text check (char_length(sample_reading_url) <= 300),
  agreed_to_code boolean not null default false,
  status text not null default 'new' check (status in ('new', 'trial', 'accepted', 'declined'))
);
alter table public.reader_applications enable row level security;

-- Listed readers. Public can read rows with status 'listed'; only the server writes.
create table public.readers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{3,40}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  tagline text check (char_length(tagline) <= 120),
  bio text check (char_length(bio) <= 1500),
  photo_url text,
  modalities text[] not null default '{}',   -- astrology, tarot, oracle, coaching, shadow-work, ...
  languages text[] not null default '{}',    -- ISO codes: en, nl, es, ...
  timezone text check (char_length(timezone) <= 64),
  booking_url text not null,                 -- phase 1: their own site or booking page
  price_from_eur numeric(7, 2),
  bird_certified boolean not null default false,
  founding boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'listed', 'paused')),
  created_at timestamptz not null default now()
);
alter table public.readers enable row level security;
create policy "readers: public can read listed" on public.readers for select to anon, authenticated using (status = 'listed');

-- Chart Match (later): a reader's birth data, kept apart from the public row.
-- No policies: only the server (service role) reads it to compute matches.
create table public.reader_charts (
  reader_id uuid primary key references public.readers (id) on delete cascade,
  birth_date date not null,
  birth_time time,
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  timezone text not null check (char_length(timezone) <= 64)
);
alter table public.reader_charts enable row level security;

-- Outbound clicks, so readers and we can see what the directory brings them (no personal data).
create table public.reader_clicks (
  id bigint generated always as identity primary key,
  reader_id uuid not null references public.readers (id) on delete cascade,
  clicked_at timestamptz not null default now(),
  source text check (char_length(source) <= 40)
);
alter table public.reader_clicks enable row level security;
