-- ============================================================
--  StreetCats — full database setup
--  Paste this whole file into the Supabase SQL Editor and click "Run".
--  Safe to run more than once.
-- ============================================================

-- ---------- TABLES ----------

-- Profiles: one per user, holds username + scout score
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null,
  scout_score integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Cats: one record per unique cat (a "cluster" of sightings)
create table if not exists public.cats (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  description text not null,
  status      text not null default 'spotted'
              check (status in ('spotted', 'needs_foster', 'adopted')),
  lat         double precision not null,   -- blurred ~100m, safe to show
  lng         double precision not null,   -- blurred ~100m, safe to show
  created_at  timestamptz not null default now()
);

-- Sightings: one per photo upload (many sightings can point to one cat)
create table if not exists public.sightings (
  id              uuid primary key default gen_random_uuid(),
  cat_id          uuid not null references public.cats(id) on delete cascade,
  photographer_id uuid not null references public.profiles(id) on delete cascade,
  photo_url       text not null,
  original_lat    double precision not null,  -- exact, kept private
  original_lng    double precision not null,  -- exact, kept private
  created_at      timestamptz not null default now()
);

-- Adoption requests: someone wants to adopt a cat
create table if not exists public.adoption_requests (
  id              uuid primary key default gen_random_uuid(),
  cat_id          uuid not null references public.cats(id) on delete cascade,
  requester_id    uuid not null references public.profiles(id) on delete cascade,
  photographer_id uuid not null references public.profiles(id) on delete cascade,
  message         text not null,
  status          text not null default 'pending'
                  check (status in ('pending', 'connected', 'adopted')),
  created_at      timestamptz not null default now()
);

-- Messages: in-app chat tied to an adoption request
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.adoption_requests(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ---------- AUTO-CREATE A PROFILE WHEN SOMEONE SIGNS UP ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- SCOUT SCORE: +10 WHEN A CAT GETS ADOPTED ----------

create or replace function public.increment_scout_score(photographer_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.profiles
  set scout_score = scout_score + 10
  where id = photographer_id;
$$;

-- ---------- SECURITY (Row Level Security) ----------
-- Turn on RLS so the database controls who can read/write what.

alter table public.profiles          enable row level security;
alter table public.cats              enable row level security;
alter table public.sightings         enable row level security;
alter table public.adoption_requests enable row level security;
alter table public.messages          enable row level security;

-- Profiles: everyone can read; you can only edit your own
drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles insert" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read"   on public.profiles for select using (true);
create policy "profiles insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update" on public.profiles for update using (auth.uid() = id);

-- Cats: everyone can read; signed-in users can add and update
drop policy if exists "cats read"   on public.cats;
drop policy if exists "cats insert" on public.cats;
drop policy if exists "cats update" on public.cats;
create policy "cats read"   on public.cats for select using (true);
create policy "cats insert" on public.cats for insert to authenticated with check (true);
create policy "cats update" on public.cats for update to authenticated using (true);

-- Sightings: everyone can read; you can only add sightings as yourself
drop policy if exists "sightings read"   on public.sightings;
drop policy if exists "sightings insert" on public.sightings;
create policy "sightings read"   on public.sightings for select using (true);
create policy "sightings insert" on public.sightings
  for insert to authenticated with check (auth.uid() = photographer_id);

-- Adoption requests: only the two people involved can see them
drop policy if exists "requests read"   on public.adoption_requests;
drop policy if exists "requests insert" on public.adoption_requests;
drop policy if exists "requests update" on public.adoption_requests;
create policy "requests read" on public.adoption_requests
  for select using (auth.uid() = requester_id or auth.uid() = photographer_id);
create policy "requests insert" on public.adoption_requests
  for insert to authenticated with check (auth.uid() = requester_id);
create policy "requests update" on public.adoption_requests
  for update using (auth.uid() = requester_id or auth.uid() = photographer_id);

-- Messages: only people in the conversation can read/write
drop policy if exists "messages read"   on public.messages;
drop policy if exists "messages insert" on public.messages;
create policy "messages read" on public.messages
  for select using (
    request_id in (
      select id from public.adoption_requests
      where auth.uid() = requester_id or auth.uid() = photographer_id
    )
  );
create policy "messages insert" on public.messages
  for insert to authenticated with check (
    auth.uid() = sender_id
    and request_id in (
      select id from public.adoption_requests
      where auth.uid() = requester_id or auth.uid() = photographer_id
    )
  );

-- ---------- PHOTO STORAGE ----------
-- A public bucket to hold the cat photos.

insert into storage.buckets (id, name, public)
values ('cat-photos', 'cat-photos', true)
on conflict (id) do nothing;

drop policy if exists "cat photos public read" on storage.objects;
drop policy if exists "cat photos upload"      on storage.objects;
create policy "cat photos public read" on storage.objects
  for select using (bucket_id = 'cat-photos');
create policy "cat photos upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'cat-photos');

-- ============================================================
--  Done! Your StreetCats database is ready.
-- ============================================================
