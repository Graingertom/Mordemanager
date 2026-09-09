-- ============================================================
-- MORDEMANAGER - BREAK THE WARBANDS/GAMES/GAME_WARBANDS CYCLE
-- ============================================================
--
-- 006 removed the single-table self-reference on warbands, but a
-- flat, unembedded `select * from warbands` (or game_warbands)
-- STILL recurses. Root cause is a different, worse pattern: two
-- tables whose SELECT policies query each other.
--
--   warbands "select if gm of a game it's in" queries
--     game_warbands + games
--   game_warbands "select if own warband is in it" queries
--     warbands
--
-- That's a genuine two-node cycle (warbands -> game_warbands ->
-- warbands), and separately games "select if participant via a
-- warband" queries game_warbands + warbands while game_warbands
-- "select if gm" queries games (games -> game_warbands -> games).
-- Postgres's recursion detector is structural: it doesn't matter
-- that each individual policy looks fine, or that only one branch
-- would actually match at runtime - planning has to account for
-- every permissive policy, and any cycle anywhere in that graph
-- is refused outright, function/language/embedding notwithstanding.
--
-- This was also masking a real bug: the qual actually stored for
-- "warbands: select if gm of a game it's in" reads
-- `gw.warband_id = g.id` - comparing to games.id instead of
-- warbands.id. Writing bare `id` inside a subquery that joins a
-- table which ALSO has an `id` column resolves to the INNER
-- table's id, not the outer row being checked - it silently never
-- matched anything. Same shadowing risk existed in games' policy
-- below (joins warbands, which also has an `id` column), fixed
-- here by qualifying with the table name explicitly.
--
-- Fix: make game_warbands a genuine leaf in the policy graph -
-- visible to any signed-in user, the same way profiles' display
-- names are. It's just two UUIDs (which warband is linked to which
-- game); the actual protected content (warband/game details) stays
-- gated by warbands'/games' own policies. That removes every
-- back-edge through game_warbands. The one remaining edge that
-- would still cycle - a GM reading a full warband record directly
-- because it's in their game - is dropped.
--
-- Functionality trade-off (flagging clearly, as with 006): a GM
-- can no longer see the full details (name, treasury, fighters) of
-- a warband they don't own, purely by being the game's GM - they
-- can still see THAT a warband is linked to their game (via
-- game_warbands, now open), and the game/scenario/settlements
-- remain fully visible to them. Revisit later with a maintained
-- visibility table kept in sync by triggers if GMs need full
-- warband detail on other players' warbands.
-- ============================================================

drop policy if exists "warbands: select if gm of a game it's in" on public.warbands;

drop policy if exists "game_warbands: select if gm" on public.game_warbands;
drop policy if exists "game_warbands: select if own warband is in it" on public.game_warbands;

create policy "game_warbands: any signed-in user can view"
    on public.game_warbands for select
    using (auth.role() = 'authenticated');


-- Fix the same column-shadowing bug here: bare `id` inside a
-- subquery that joins warbands (which has its own `id` column)
-- resolved to warbands.id instead of the outer games.id.

drop policy if exists "games: select if participant via a warband" on public.games;

create policy "games: select if participant via a warband"
    on public.games for select
    using (
        exists (
            select 1
            from public.game_warbands gw
            join public.warbands w on w.id = gw.warband_id
            where gw.game_id = public.games.id
              and w.owner_id = auth.uid()
        )
    );
