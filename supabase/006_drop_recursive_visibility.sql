-- ============================================================
-- MORDEMANAGER - REMOVE THE UNFIXABLE RECURSIVE CASE
-- ============================================================
--
-- 005's language change (sql -> plpgsql) did not fix the
-- recursion - the detection is structural, not about the planner
-- inlining a SQL-language function. There is no way to phrase
-- "can I see this warband because I own a DIFFERENT warband that
-- shares a game with it" that Postgres's recursion detector will
-- accept: it requires querying warbands.owner_id from within a
-- policy already attached to warbands, and the detector flags any
-- structural path back to the same relation - subquery, join,
-- function, any function language - regardless of whether it
-- would actually loop at runtime.
--
-- Fix: drop that specific case. Warbands visibility becomes:
-- own it directly, or you're the GM of a game it's in (which only
-- ever touches game_warbands + games, never warbands itself -
-- genuinely, structurally safe, not just hopefully safe).
--
-- "I can see it because MY OTHER warband shares a game with it,
-- but I'm not the GM" is no longer supported. Not blocking
-- anything today; worth revisiting with a different approach
-- (e.g. a maintained visibility table kept in sync by triggers)
-- rather than continuing to fight RLS's recursion detector.
--
-- Also re-applying game_warbands' safe (004-style) policies
-- defensively, in case 004 wasn't run before 005 - the ORIGINAL
-- game_warbands policy (calling is_game_participant, whose "do I
-- own a warband in this game" branch queries game_warbands via a
-- join) is exactly this same recursive pattern, for game_warbands
-- itself, independent of function language.
-- ============================================================

drop policy if exists "warbands: select if shared via a game" on public.warbands;

create policy "warbands: select if gm of a game it's in"
    on public.warbands for select
    using (
        exists (
            select 1
            from public.game_warbands gw
            join public.games g on g.id = gw.game_id
            where gw.warband_id = id
              and g.game_master_id = auth.uid()
        )
    );


drop policy if exists "game_warbands: select if participant" on public.game_warbands;
drop policy if exists "game_warbands: select if gm" on public.game_warbands;
drop policy if exists "game_warbands: select if own warband is in it" on public.game_warbands;

create policy "game_warbands: select if gm"
    on public.game_warbands for select
    using (
        exists (
            select 1 from public.games g
            where g.id = game_id
              and g.game_master_id = auth.uid()
        )
    );

create policy "game_warbands: select if own warband is in it"
    on public.game_warbands for select
    using (
        exists (
            select 1 from public.warbands w
            where w.id = warband_id
              and w.owner_id = auth.uid()
        )
    );
