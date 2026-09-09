-- ============================================================
-- MORDEMANAGER - SUPABASE SCHEMA + ROW LEVEL SECURITY
-- ============================================================
--
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor
-- -> New query) on a fresh project. Safe to run top to bottom.
--
-- Decisions this encodes (confirmed with the user):
--   - A warband's owner can edit it; nobody else can.
--   - A game's "game master" is fixed at creation time (whoever
--     creates the game) and cannot be reassigned later.
--   - Only the game master can edit the scenario.
--
-- Judgment calls made beyond what was explicitly specified,
-- flagged for review:
--   1. GAME STATUS (active/completed) is also restricted to the
--      game master, not just the scenario - same "GM manages the
--      game" rule applied consistently. If players should be able
--      to mark a game complete themselves, this needs loosening.
--   2. GAME_WARBANDS (which warbands are in a game): a warband's
--      OWNER can add/remove their own warband (self-join/leave),
--      and the GAME MASTER can add/remove ANY warband (manage the
--      roster). This wasn't specified - it's my best guess at how
--      this should work and may not match what you want.
--   3. SETTLEMENTS: treated as GM-managed territory, so only the
--      game master can add/edit/remove them. Participants can
--      view them. This also wasn't specified.
--   4. Added a PROFILES table for a display name (since magic-link
--      auth only gives us an email, and "Owned by tom@email.com"
--      isn't great to show other players). Defaults to the part
--      of your email before the @; the app will let you change it,
--      replacing the old local "Playing As" name.
--
-- ============================================================


-- ============================================================
-- TABLES
-- ============================================================

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '',
    created_at timestamptz not null default now()
);

create table public.warbands (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    type text not null default 'reikland',
    treasury integer not null default 0,
    created_at timestamptz not null default now()
);

create table public.fighters (
    id uuid primary key default gen_random_uuid(),
    warband_id uuid not null references public.warbands(id) on delete cascade,
    type text not null,
    type_name text not null,
    category text not null default 'henchman',
    name text not null,
    profile jsonb not null default '{}'::jsonb,
    base_cost integer not null default 0,
    equipment jsonb not null default '[]'::jsonb,
    skills jsonb not null default '[]'::jsonb,
    experience integer not null default 0,
    advances jsonb not null default '[]'::jsonb,
    injuries jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

create table public.games (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    game_master_id uuid not null references auth.users(id) on delete cascade,
    status text not null default 'active' check (status in ('active', 'completed')),
    scenario_name text not null default '',
    scenario_description text not null default '',
    created_at timestamptz not null default now()
);

-- Which warbands are currently in which game.
create table public.game_warbands (
    game_id uuid not null references public.games(id) on delete cascade,
    warband_id uuid not null references public.warbands(id) on delete cascade,
    added_at timestamptz not null default now(),
    primary key (game_id, warband_id)
);

create table public.settlements (
    id uuid primary key default gen_random_uuid(),
    game_id uuid not null references public.games(id) on delete cascade,
    name text not null,
    note text not null default '',
    warband_id uuid references public.warbands(id) on delete set null,
    created_at timestamptz not null default now()
);


-- ============================================================
-- NEW USER -> PROFILE
-- ============================================================
--
-- Every signed-up user automatically gets a profile row, with a
-- placeholder display name derived from their email.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, display_name)
    values (new.id, split_part(new.email, '@', 1));

    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();


-- ============================================================
-- AUTHORISATION HELPERS
-- ============================================================
--
-- security definer so these can read across tables without
-- getting tangled in the RLS policies of the tables they check -
-- the standard Supabase pattern for this kind of predicate.

create function public.is_game_participant(_game_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.games g
        where g.id = _game_id
          and g.game_master_id = auth.uid()
    )
    or exists (
        select 1
        from public.game_warbands gw
        join public.warbands w on w.id = gw.warband_id
        where gw.game_id = _game_id
          and w.owner_id = auth.uid()
    );
$$;

create function public.can_view_warband(_warband_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.warbands w
        where w.id = _warband_id
          and w.owner_id = auth.uid()
    )
    or exists (
        select 1
        from public.game_warbands gw
        where gw.warband_id = _warband_id
          and public.is_game_participant(gw.game_id)
    );
$$;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.warbands enable row level security;
alter table public.fighters enable row level security;
alter table public.games enable row level security;
alter table public.game_warbands enable row level security;
alter table public.settlements enable row level security;


-- ---- PROFILES ----------------------------------------------
-- Display names are visible to any signed-in user (so "Owned by
-- X" can render for other players), but only editable by their
-- own owner.

create policy "profiles: any signed-in user can view"
    on public.profiles for select
    using (auth.role() = 'authenticated');

create policy "profiles: user can update own profile"
    on public.profiles for update
    using (id = auth.uid())
    with check (id = auth.uid());


-- ---- WARBANDS ------------------------------------------------
-- View: the owner, or anyone sharing a game with this warband.
-- Write: the owner only.

create policy "warbands: select if owner or shared via a game"
    on public.warbands for select
    using (public.can_view_warband(id));

create policy "warbands: owner can insert"
    on public.warbands for insert
    with check (owner_id = auth.uid());

create policy "warbands: owner can update"
    on public.warbands for update
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());

create policy "warbands: owner can delete"
    on public.warbands for delete
    using (owner_id = auth.uid());


-- ---- FIGHTERS --------------------------------------------------
-- Same visibility as the warband they belong to. Only the
-- warband's owner can add/edit/remove fighters on it.

create policy "fighters: select if warband is visible"
    on public.fighters for select
    using (public.can_view_warband(warband_id));

create policy "fighters: warband owner can insert"
    on public.fighters for insert
    with check (
        exists (
            select 1 from public.warbands w
            where w.id = warband_id
              and w.owner_id = auth.uid()
        )
    );

create policy "fighters: warband owner can update"
    on public.fighters for update
    using (
        exists (
            select 1 from public.warbands w
            where w.id = warband_id
              and w.owner_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.warbands w
            where w.id = warband_id
              and w.owner_id = auth.uid()
        )
    );

create policy "fighters: warband owner can delete"
    on public.fighters for delete
    using (
        exists (
            select 1 from public.warbands w
            where w.id = warband_id
              and w.owner_id = auth.uid()
        )
    );


-- ---- GAMES -----------------------------------------------------
-- View: any participant (GM, or owner of a warband in the game).
-- Insert: you become the GM of any game you create.
-- Update/delete: the GM only. The WITH CHECK on update also means
-- game_master_id can never be changed to someone else through the
-- API - the GM is permanent once set, matching "decided on
-- creation".

create policy "games: select if participant"
    on public.games for select
    using (public.is_game_participant(id));

create policy "games: creator becomes game master"
    on public.games for insert
    with check (game_master_id = auth.uid());

create policy "games: gm can update"
    on public.games for update
    using (game_master_id = auth.uid())
    with check (game_master_id = auth.uid());

create policy "games: gm can delete"
    on public.games for delete
    using (game_master_id = auth.uid());


-- ---- GAME_WARBANDS -----------------------------------------
-- View: any participant.
-- Insert/delete: the warband's own owner (join/leave), or the
-- game's GM (manage the roster).

create policy "game_warbands: select if participant"
    on public.game_warbands for select
    using (public.is_game_participant(game_id));

create policy "game_warbands: warband owner or gm can insert"
    on public.game_warbands for insert
    with check (
        exists (
            select 1 from public.warbands w
            where w.id = warband_id
              and w.owner_id = auth.uid()
        )
        or exists (
            select 1 from public.games g
            where g.id = game_id
              and g.game_master_id = auth.uid()
        )
    );

create policy "game_warbands: warband owner or gm can delete"
    on public.game_warbands for delete
    using (
        exists (
            select 1 from public.warbands w
            where w.id = warband_id
              and w.owner_id = auth.uid()
        )
        or exists (
            select 1 from public.games g
            where g.id = game_id
              and g.game_master_id = auth.uid()
        )
    );


-- ---- SETTLEMENTS -----------------------------------------------
-- View: any participant.
-- Write: the game's GM only (territory is GM-adjudicated).

create policy "settlements: select if participant"
    on public.settlements for select
    using (public.is_game_participant(game_id));

create policy "settlements: gm can insert"
    on public.settlements for insert
    with check (
        exists (
            select 1 from public.games g
            where g.id = game_id
              and g.game_master_id = auth.uid()
        )
    );

create policy "settlements: gm can update"
    on public.settlements for update
    using (
        exists (
            select 1 from public.games g
            where g.id = game_id
              and g.game_master_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.games g
            where g.id = game_id
              and g.game_master_id = auth.uid()
        )
    );

create policy "settlements: gm can delete"
    on public.settlements for delete
    using (
        exists (
            select 1 from public.games g
            where g.id = game_id
              and g.game_master_id = auth.uid()
        )
    );
