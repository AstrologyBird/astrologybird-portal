-- Your Constellation, Learn From Your Own Sky (with card unlocks) and the reader directory.
-- NOT yet applied to project bjcseowrzyhylhjtozih: apply together with the deploy of this branch.

-- ---------------------------------------------------------------------------
-- Learn From Your Own Sky
-- ---------------------------------------------------------------------------

-- A finished lesson. Lesson ids live in code (lib/learn.ts).
create table public.lesson_progress (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id text not null check (char_length(lesson_id) <= 40),
  completed_at timestamptz not null default now(),
  primary key (owner_id, lesson_id)
);
alter table public.lesson_progress enable row level security;
create policy "lessons: owner can read" on public.lesson_progress for select to authenticated using ((select auth.uid()) = owner_id);
create policy "lessons: owner can insert" on public.lesson_progress for insert to authenticated with check ((select auth.uid()) = owner_id);

-- A card face in the user's collection: 26 cards x 2 sides = 52 faces.
-- 'front' comes from a lesson or tapping a physical card; 'blacklight' only after a shadow answer.
create table public.card_unlocks (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id text not null check (card_id ~ '^[a-z-]{3,20}$'),
  side text not null check (side in ('front', 'blacklight')),
  source text not null default 'lesson' check (source in ('lesson', 'tap', 'reading')),
  unlocked_at timestamptz not null default now(),
  primary key (owner_id, card_id, side)
);
alter table public.card_unlocks enable row level security;
create policy "unlocks: owner can read" on public.card_unlocks for select to authenticated using ((select auth.uid()) = owner_id);
create policy "unlocks: owner can insert" on public.card_unlocks for insert to authenticated with check ((select auth.uid()) = owner_id);

-- Private shadow answers. Only the owner can read them; they may delete them at any time.
-- Never shared with readers or used for AI without an explicit, separate consent.
create table public.shadow_answers (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id text not null check (card_id ~ '^[a-z-]{3,20}$'),
  lesson_id text check (char_length(lesson_id) <= 40),
  answer text not null check (char_length(answer) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index shadow_answers_owner_idx on public.shadow_answers (owner_id, created_at desc);
alter table public.shadow_answers enable row level security;
create policy "shadow: owner can read" on public.shadow_answers for select to authenticated using ((select auth.uid()) = owner_id);
create policy "shadow: owner can insert" on public.shadow_answers for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "shadow: owner can delete" on public.shadow_answers for delete to authenticated using ((select auth.uid()) = owner_id);

-- A Black Light face can only be unlocked when a shadow answer for that card exists.
create function public.require_shadow_answer() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.side = 'blacklight' and not exists (
    select 1 from public.shadow_answers s where s.owner_id = new.owner_id and s.card_id = new.card_id
  ) then
    raise exception 'answer the shadow question first';
  end if;
  return new;
end;
$$;
create trigger card_unlocks_blacklight before insert on public.card_unlocks for each row execute function public.require_shadow_answer();
revoke execute on function public.require_shadow_answer() from public, anon, authenticated;

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
