-- ============================================================
-- MORDEMANAGER - FRIENDS SYSTEM
-- ============================================================
--
-- A mutual-accept friend request between two users. Once
-- accepted, either side can view (never edit) the other's
-- warbands and games - editing is unaffected, since every
-- write policy on warbands/fighters/games stays owner-only.
--
-- friendships' own RLS is entirely self-contained (only ever
-- compares requester_id/addressee_id to auth.uid() - no
-- reference to any other RLS-protected table), so it can never
-- participate in the kind of cross-table recursion cycle fixed
-- in 006/007. requester_id/addressee_id reference public.profiles
-- (not auth.users) so PostgREST can embed display names directly,
-- same reason 002 repointed warbands.owner_id/games.game_master_id.
--
-- Read access to a friend's warbands/games goes through security
-- definer RPCs (same pattern as search_warbands/get_warband_stubs
-- in 010) rather than widening warbands'/games' own RLS - that
-- keeps the existing owner-only policies completely untouched,
-- so this adds a new capability without risking the old one.
-- ============================================================

create table public.friendships (
    id uuid primary key default gen_random_uuid(),
    requester_id uuid not null references public.profiles(id) on delete cascade,
    addressee_id uuid not null references public.profiles(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'accepted')),
    created_at timestamptz not null default now(),

    constraint no_self_friendship check (requester_id <> addressee_id),
    constraint unique_friendship unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "friendships: select if involved"
    on public.friendships for select
    using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "friendships: requester can insert"
    on public.friendships for insert
    with check (requester_id = auth.uid());

create policy "friendships: addressee can accept"
    on public.friendships for update
    using (addressee_id = auth.uid())
    with check (addressee_id = auth.uid() and status = 'accepted');

create policy "friendships: either side can delete"
    on public.friendships for delete
    using (requester_id = auth.uid() or addressee_id = auth.uid());


-- ============================================================
-- SEARCH FOR USERS TO ADD
-- ============================================================

create or replace function public.search_users(search_term text default '')
returns table (
    id uuid,
    display_name text
)
language sql
security definer
set search_path = public
as $$
    select p.id, p.display_name
    from public.profiles p
    where p.id <> auth.uid()
      and p.display_name ilike '%' || coalesce(search_term, '') || '%'
    order by p.display_name
    limit 25;
$$;

revoke all on function public.search_users(text) from public;
grant execute on function public.search_users(text) to authenticated;


-- ============================================================
-- READ A FRIEND'S WARBANDS / FIGHTERS / GAMES
-- ============================================================
--
-- Each checks for an accepted friendship between auth.uid() and
-- target_user_id before returning anything - if there isn't one,
-- the result is simply empty, not an error.

create or replace function public.get_friend_warbands(target_user_id uuid)
returns table (
    id uuid,
    owner_id uuid,
    name text,
    type text,
    treasury integer,
    stash jsonb,
    created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
    select w.id, w.owner_id, w.name, w.type, w.treasury, w.stash, w.created_at
    from public.warbands w
    where w.owner_id = target_user_id
      and w.status = 'active'
      and exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and (
                (f.requester_id = auth.uid() and f.addressee_id = target_user_id)
                or (f.addressee_id = auth.uid() and f.requester_id = target_user_id)
            )
      );
$$;

revoke all on function public.get_friend_warbands(uuid) from public;
grant execute on function public.get_friend_warbands(uuid) to authenticated;


create or replace function public.get_friend_fighters(target_user_id uuid)
returns table (
    id uuid,
    warband_id uuid,
    type text,
    type_name text,
    category text,
    name text,
    profile jsonb,
    base_cost integer,
    equipment jsonb,
    skills jsonb,
    experience integer,
    advances jsonb,
    injuries jsonb
)
language sql
security definer
set search_path = public
as $$
    select
        f.id, f.warband_id, f.type, f.type_name, f.category, f.name,
        f.profile, f.base_cost, f.equipment, f.skills, f.experience,
        f.advances, f.injuries
    from public.fighters f
    join public.warbands w on w.id = f.warband_id
    where w.owner_id = target_user_id
      and exists (
          select 1 from public.friendships fr
          where fr.status = 'accepted'
            and (
                (fr.requester_id = auth.uid() and fr.addressee_id = target_user_id)
                or (fr.addressee_id = auth.uid() and fr.requester_id = target_user_id)
            )
      );
$$;

revoke all on function public.get_friend_fighters(uuid) from public;
grant execute on function public.get_friend_fighters(uuid) to authenticated;


create or replace function public.get_friend_games(target_user_id uuid)
returns table (
    id uuid,
    name text,
    game_master_id uuid,
    status text,
    scenario_name text,
    scenario_description text,
    created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
    select distinct g.id, g.name, g.game_master_id, g.status,
        g.scenario_name, g.scenario_description, g.created_at
    from public.games g
    left join public.game_warbands gw on gw.game_id = g.id
    left join public.warbands w on w.id = gw.warband_id
    where (
        g.game_master_id = target_user_id
        or w.owner_id = target_user_id
    )
      and exists (
          select 1 from public.friendships fr
          where fr.status = 'accepted'
            and (
                (fr.requester_id = auth.uid() and fr.addressee_id = target_user_id)
                or (fr.addressee_id = auth.uid() and fr.requester_id = target_user_id)
            )
      );
$$;

revoke all on function public.get_friend_games(uuid) from public;
grant execute on function public.get_friend_games(uuid) to authenticated;
