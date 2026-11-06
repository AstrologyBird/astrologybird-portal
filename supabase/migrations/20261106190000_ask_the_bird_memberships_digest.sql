-- Ask the Bird (AI chat), memberships and the daily digest log.

-- Memberships are written only by the server (Stripe webhook, service role).
-- Members can read their own row; nobody can write it from the browser.
create table public.memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'inactive' check (status in ('inactive', 'active', 'trialing', 'past_due', 'canceled')),
  plan text check (plan in ('monthly', 'yearly', 'founding', 'gift')),
  current_period_end timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  updated_at timestamptz not null default now()
);
alter table public.memberships enable row level security;
create policy "memberships: owner can read" on public.memberships for select to authenticated using ((select auth.uid()) = user_id);

-- Conversation with the Bird. No update/delete policy: the monthly free quota
-- counts the user's own questions, so they cannot be removed to reset it.
create table public.bird_messages (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);
create index bird_messages_owner_created on public.bird_messages (owner_id, created_at desc);
alter table public.bird_messages enable row level security;
create policy "bird: owner can read" on public.bird_messages for select to authenticated using ((select auth.uid()) = owner_id);
create policy "bird: owner can insert" on public.bird_messages for insert to authenticated with check ((select auth.uid()) = owner_id);

-- One digest per user per day (written by the daily job with the service role).
create table public.digest_sends (
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_on date not null,
  primary key (user_id, sent_on)
);
alter table public.digest_sends enable row level security;
