-- ============================================================
-- MORDEMANAGER - PREVENTIVE FIX: game_warbands SELECT policy
-- ============================================================
--
-- Same root cause as 003, found by inspection rather than by
-- hitting it: game_warbands' SELECT policy calls
-- is_game_participant(), which (in its "do I own a warband in
-- this game" branch) re-queries public.game_warbands - the same
-- table the policy protects. That's the exact pattern that broke
-- INSERT ... RETURNING on warbands and games.
--
-- Nothing is broken today - addWarbandToGame() never chains
-- .select() after its insert into game_warbands, so RETURNING is
-- never requested and this self-reference is never exercised. This
-- is purely removing the landmine before something (a future
-- feature, a refactor) chains .select() there and rediscovers it
-- the hard way.
--
-- Same fix shape as 003: split into two direct-comparison
-- policies, neither of which queries game_warbands itself.
-- ============================================================

drop policy "game_warbands: select if participant" on public.game_warbands;

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
