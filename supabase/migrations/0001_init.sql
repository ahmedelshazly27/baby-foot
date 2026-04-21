-- Foosball ELO schema
-- Run via: pnpm tsx scripts/migrate.ts

create extension if not exists "pgcrypto";

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rating numeric(6,1) not null default 1200.0,
  games_played int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists players_name_lower_unique
  on public.players (lower(name));

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  team_a_p1 uuid not null references public.players(id) on delete restrict,
  team_a_p2 uuid not null references public.players(id) on delete restrict,
  team_b_p1 uuid not null references public.players(id) on delete restrict,
  team_b_p2 uuid not null references public.players(id) on delete restrict,
  score_a int not null,
  score_b int not null,
  played_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint matches_score_first_to_ten check (
    (score_a = 10 and score_b between 0 and 9) or
    (score_b = 10 and score_a between 0 and 9)
  ),

  constraint matches_distinct_players check (
    team_a_p1 <> team_a_p2 and
    team_a_p1 <> team_b_p1 and
    team_a_p1 <> team_b_p2 and
    team_a_p2 <> team_b_p1 and
    team_a_p2 <> team_b_p2 and
    team_b_p1 <> team_b_p2
  )
);

create index if not exists matches_played_at_idx on public.matches (played_at);

create table if not exists public.rating_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  rating_before numeric(6,1) not null,
  rating_after numeric(6,1) not null,
  delta numeric(6,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists rating_history_player_idx on public.rating_history (player_id, created_at);
create index if not exists rating_history_match_idx on public.rating_history (match_id);

-- v1 has no auth: allow anon read-only to the public tables; writes go through the service role key.
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.rating_history enable row level security;

drop policy if exists "anon can read players" on public.players;
drop policy if exists "anon can read matches" on public.matches;
drop policy if exists "anon can read rating_history" on public.rating_history;

create policy "anon can read players" on public.players for select using (true);
create policy "anon can read matches" on public.matches for select using (true);
create policy "anon can read rating_history" on public.rating_history for select using (true);
