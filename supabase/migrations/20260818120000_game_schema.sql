-- Verse Clash room-state schema.
-- Apply in the Supabase SQL editor or with the CLI after creating a project.
--
-- Rooms are stored as a single JSONB blob per row (matching the in-memory
-- RoomState shape in lib/game/state.ts) rather than normalized tables, so
-- the game-logic code (lib/game/commands.ts, phase.ts, views.ts) needs no
-- changes to read/write through Postgres. `version` implements optimistic
-- concurrency: writers only succeed if the version they read still matches,
-- and retry on conflict (see `withRoom` in lib/game/commands.ts).
--
-- This table is only ever read/written by trusted server code (Next.js
-- server actions) using the Supabase service_role key — never the anon key
-- clients use for auth — so no RLS policy is defined here on purpose. If a
-- future change lets browsers read this table directly, add RLS then.

create table if not exists rooms (
  code text primary key check (char_length(code) = 6),
  state jsonb not null,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_updated_at_idx on rooms (updated_at);

revoke all on rooms from anon, authenticated;
