-- Applied to project bjcseowrzyhylhjtozih on 2026-11-06 (accounts_profiles_people + revoke_trigger_functions).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  locale text not null default 'en' check (locale in ('en', 'nl')),
  birth_date date,
  birth_time time,
  time_unknown boolean not null default false,
  place_name text check (char_length(place_name) <= 120),
  lat double precision check (lat between -90 and 90),
  lon double precision check (lon between -180 and 180),
  timezone text check (char_length(timezone) <= 64),
  house_system text not null default 'placidus' check (house_system in ('placidus', 'wholeSign')),
  digest_opt_in boolean not null default false,
  digest_hour smallint not null default 7 check (digest_hour between 0 and 23),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  relation text check (char_length(relation) <= 40),
  birth_date date not null,
  birth_time time,
  time_unknown boolean not null default false,
  place_name text not null check (char_length(place_name) <= 120),
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  timezone text not null check (char_length(timezone) <= 64),
  created_at timestamptz not null default now()
);
create index people_owner_idx on public.people (owner_id, created_at);

alter table public.profiles enable row level security;
alter table public.people enable row level security;

create policy "profiles: owner can read" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: owner can insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles: owner can update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "people: owner can read" on public.people for select to authenticated using ((select auth.uid()) = owner_id);
create policy "people: owner can insert" on public.people for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "people: owner can update" on public.people for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "people: owner can delete" on public.people for delete to authenticated using ((select auth.uid()) = owner_id);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.limit_people() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.people where owner_id = new.owner_id) >= 50 then
    raise exception 'people limit reached';
  end if;
  return new;
end;
$$;
create trigger people_limit before insert on public.people for each row execute function public.limit_people();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.limit_people() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
