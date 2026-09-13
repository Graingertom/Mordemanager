-- ============================================================
-- MORDEMANAGER - FIGHTER STATUS (RETIRE/DEAD) AND WOUNDS TRACKING
-- ============================================================
--
-- status: same retire pattern already used on warbands.status
-- (009) - 'retired' is a manual, reversible, deletable-once-
-- retired state; 'dead' is a permanent historical record set by
-- the game itself (a Hero's "Dead" Serious Injury, or a Henchman's
-- 1-2 Out of Action roll) and is never deletable.
--
-- wounds: keyed by game id (a warband can be in more than one
-- concurrent game), each entry {remaining, round, outOfAction}.
-- `round` is compared against that game's scenario_round to tell
-- a current battle's wound record from a stale one left over from
-- a previous scenario.
--
-- scenario_round: bumped only by the new "Start New Battle" action
-- (js/games.js), never by a plain scenario edit, so fixing a typo
-- in the scenario description doesn't spuriously reset everyone's
-- wounds.
-- ============================================================

alter table public.fighters
    add column status text not null default 'active'
        check (status in ('active', 'retired', 'dead')),
    add column wounds jsonb not null default '{}'::jsonb;

alter table public.games
    add column scenario_round integer not null default 1;
