-- Profiles table for Ghost in the Machine
-- Run this in your Supabase SQL editor or via the CLI.

create table if not exists public.profiles (
  id         text primary key,          -- matches the playerId from localStorage
  name       text not null,
  created_at timestamptz default now(),
  games_played integer default 0,
  wins       integer default 0
);

-- Allow anonymous reads/writes for the game (tighten for production)
alter table public.profiles enable row level security;

create policy "Anyone can read profiles"
  on public.profiles for select
  using (true);

create policy "Anyone can insert their own profile"
  on public.profiles for insert
  with check (true);

create policy "Anyone can update their own profile"
  on public.profiles for update
  using (true);
