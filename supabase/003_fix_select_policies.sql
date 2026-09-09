-- ============================================================
-- MORDEMANAGER - FIX SELF-REFERENTIAL SELECT POLICIES
-- ============================================================
--
-- Root cause: warbands' and games' SELECT policies called a
-- function that re-queries the SAME table the policy protects
-- (can_view_warband queries warbands; is_game_participant queries
-- games). That works fine for a plain SELECT, but breaks
-- specifically for INSERT ... RETURNING (what .insert().select()
-- generates client-side) - the row just inserted isn't reliably
-- visible to that nested self-query in time for RETURNING's policy
-- check, even though it's visible to a normal SELECT run right
-- after. Symptom: insert alone succeeds, a separate select of the
-- same row succeeds, but insert+select together fails with "new
-- row violates row-level security policy" - which is what sent
-- this investigation everywhere except here for so long.
--
-- Fix: split each policy into two - a simple, direct column
-- comparison for "am I the owner/GM" (no subquery, so nothing to
-- go wrong), and a separate policy for "do I share a game with
-- this" that only ever queries OTHER tables, never itself.
-- ============================================================

drop policy "warbands: select if owner or shared via a game" on public.warbands;

create policy "warbands: owner can select"
    on public.warbands for select
    using (owner_id = auth.uid());

create policy "warbands: select if shared via a game"
    on public.warbands for select
    using (
        exists (
            select 1
            from public.game_warbands gw
            where gw.warband_id = id
              and public.is_game_participant(gw.game_id)
        )
    );


drop policy "games: select if participant" on public.games;

create policy "games: gm can select"
    on public.games for select
    using (game_master_id = auth.uid());

create policy "games: select if participant via a warband"
    on public.games for select
    using (
        exists (
            select 1
            from public.game_warbands gw
            join public.warbands w on w.id = gw.warband_id
            where gw.game_id = id
              and w.owner_id = auth.uid()
        )
    );


-- ============================================================
-- CLEAN UP DEBUGGING ARTIFACTS
-- ============================================================

drop table if exists public.rls_test;
drop function if exists public.debug_auth_uid();
drop function if exists public.debug_check_owner(uuid);

delete from public.warbands where name like 'Debug Test%';
