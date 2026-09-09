-- ============================================================
-- MORDEMANAGER - FIX INFINITE RECURSION IN WARBANDS POLICY
-- ============================================================
--
-- 003 split warbands' SELECT policy into "I own it" (a direct
-- column comparison, fine) and "I share it via a game" (which
-- calls is_game_participant()). The problem: is_game_participant
-- itself queries public.warbands (to check "do I own another
-- warband in this same game"). That means warbands' own policy,
-- through a function call, ends up querying warbands again -
-- Postgres detects that structural cycle at plan time and refuses
-- outright with "infinite recursion detected in policy", rather
-- than trusting it wouldn't actually loop at runtime.
--
-- Fix: rewrite is_game_participant (and can_view_warband, same
-- risk, used by fighters' policy) as plpgsql instead of sql.
-- Postgres's planner can inline a simple SQL-language function
-- directly into the calling query - which is exactly what re-
-- exposes the self-reference for recursion detection - but it
-- never inlines plpgsql functions, so the function call stays an
-- opaque boundary and the cycle is never structurally visible.
-- ============================================================

create or replace function public.is_game_participant(_game_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    return exists (
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
end;
$$;

create or replace function public.can_view_warband(_warband_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    return exists (
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
end;
$$;
