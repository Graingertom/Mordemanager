-- ============================================================
-- MORDEMANAGER - LET A GM ADD ANY WARBAND TO THEIR GAME
-- ============================================================
--
-- warbands' SELECT policy stays owner-only (see 007's comment on
-- why cross-referencing it with games/game_warbands causes RLS
-- recursion) - these two functions sidestep that entirely rather
-- than reopening it. Each is security definer, called directly by
-- the client (never from inside another table's policy), so it
-- never becomes part of the policy dependency graph and can't
-- trigger the recursion detector.
--
-- Both return only low-sensitivity fields (name, owner display
-- name, fighter count) - never treasury, equipment or stash, which
-- stay visible only to the warband's own owner.
--
-- search_warbands: powers the GM's "Add Warband" search, letting
-- them find and add a warband they don't own.
--
-- get_warband_stubs: backfills just enough to render a roster card
-- for a warband already in a game that the viewer doesn't own,
-- since the client's normal warbands query (still owner-scoped)
-- won't return it after a page reload.
-- ============================================================

create or replace function public.search_warbands(search_term text default '')
returns table (
    id uuid,
    name text,
    owner_display_name text,
    fighter_count bigint
)
language sql
security definer
set search_path = public
as $$
    select
        w.id,
        w.name,
        p.display_name,
        count(f.id)
    from public.warbands w
    join public.profiles p on p.id = w.owner_id
    left join public.fighters f on f.warband_id = w.id
    where w.status = 'active'
      and w.name ilike '%' || coalesce(search_term, '') || '%'
    group by w.id, w.name, p.display_name
    order by w.name
    limit 25;
$$;

revoke all on function public.search_warbands(text) from public;
grant execute on function public.search_warbands(text) to authenticated;


create or replace function public.get_warband_stubs(warband_ids uuid[])
returns table (
    id uuid,
    name text,
    owner_display_name text,
    fighter_count bigint
)
language sql
security definer
set search_path = public
as $$
    select
        w.id,
        w.name,
        p.display_name,
        count(f.id)
    from public.warbands w
    join public.profiles p on p.id = w.owner_id
    left join public.fighters f on f.warband_id = w.id
    where w.id = any(warband_ids)
    group by w.id, w.name, p.display_name;
$$;

revoke all on function public.get_warband_stubs(uuid[]) from public;
grant execute on function public.get_warband_stubs(uuid[]) to authenticated;
