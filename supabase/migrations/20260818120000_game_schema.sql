-- Verse Clash Round 1 schema, RLS, and Realtime publication.
-- Apply in the Supabase SQL editor or with the CLI after creating a project.
-- Enable Anonymous sign-ins: Authentication → Providers → Anonymous.

create extension if not exists "pgcrypto";

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) = 6),
  host_id uuid not null,
  status text not null default 'lobby',
  current_round_id uuid,
  content_mode text not null default 'work_safe' check (content_mode = 'work_safe'),
  paused boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  color text not null,
  wins integer not null default 0
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  auth_user_id uuid not null,
  display_name text not null,
  team_id uuid references teams(id) on delete set null,
  is_host boolean not null default false,
  is_ready boolean not null default false,
  last_seen_at timestamptz not null default now(),
  unique (room_id, auth_user_id)
);

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  number integer not null,
  type text not null default 'straight',
  prompt_id text not null,
  template_id text not null,
  phase text not null,
  phase_ends_at timestamptz
);

alter table rooms
  add constraint rooms_current_round_fk
  foreign key (current_round_id) references rounds(id) on delete set null;

create table if not exists round_assignments (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  slot_id text not null,
  options jsonb not null,
  selected_option_id text,
  submitted_at timestamptz
);

create table if not exists compositions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  segments jsonb not null
);

create table if not exists reveal_state (
  round_id uuid primary key references rounds(id) on delete cascade,
  team_index integer not null default 0,
  segment_index integer not null default 0
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  unique (round_id, player_id)
);

create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now()
);

create table if not exists team_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table rooms enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table rounds enable row level security;
alter table round_assignments enable row level security;
alter table compositions enable row level security;
alter table reveal_state enable row level security;
alter table votes enable row level security;
alter table reactions enable row level security;
alter table team_messages enable row level security;

create or replace function is_room_player(target_room uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from players p
    where p.room_id = target_room
      and p.auth_user_id = auth.uid()
  );
$$;

create or replace function is_room_host(target_room uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from players p
    where p.room_id = target_room
      and p.auth_user_id = auth.uid()
      and p.is_host = true
  );
$$;

create policy rooms_select on rooms
  for select using (is_room_player(id));

create policy teams_select on teams
  for select using (is_room_player(room_id));

create policy players_select on players
  for select using (is_room_player(room_id));

create policy rounds_select on rounds
  for select using (is_room_player(room_id));

create policy compositions_select on compositions
  for select using (
    exists (
      select 1 from rounds r
      where r.id = round_id and is_room_player(r.room_id)
    )
  );

create policy reveal_state_select on reveal_state
  for select using (
    exists (
      select 1 from rounds r
      where r.id = round_id and is_room_player(r.room_id)
    )
  );

create policy votes_select on votes
  for select using (
    exists (
      select 1 from rounds r
      where r.id = round_id and is_room_player(r.room_id)
    )
  );

create policy reactions_select on reactions
  for select using (
    exists (
      select 1 from rounds r
      where r.id = round_id and is_room_player(r.room_id)
    )
  );

-- Own assignment always; teammates see options/selection only after reveal.
create policy round_assignments_select on round_assignments
  for select using (
    exists (
      select 1
      from rounds r
      join players me on me.room_id = r.room_id and me.auth_user_id = auth.uid()
      join players owner on owner.id = round_assignments.player_id
      where r.id = round_assignments.round_id
        and (
          owner.auth_user_id = auth.uid()
          or r.phase in ('reveal', 'voting', 'standings', 'ended')
        )
    )
  );

create policy team_messages_select on team_messages
  for select using (
    exists (
      select 1 from players p
      where p.room_id = team_messages.room_id
        and p.auth_user_id = auth.uid()
        and p.team_id = team_messages.team_id
    )
  );

-- Mutations go through Next.js server actions. Direct client writes are denied.

alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table rounds;
alter publication supabase_realtime add table reveal_state;
alter publication supabase_realtime add table reactions;
alter publication supabase_realtime add table team_messages;
