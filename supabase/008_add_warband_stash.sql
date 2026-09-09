-- ============================================================
-- MORDEMANAGER - WARBAND EQUIPMENT STASH
-- ============================================================
--
-- Removing a fighter only ever refunded their base recruitment
-- cost, never the cost of equipment bought for them - equipment
-- was simply discarded. That's the intended economy (money spent
-- is spent), but discarding the gear itself was never intended:
-- it should stay with the warband to be handed to someone else
-- later, not vanish.
--
-- Adds a `stash` column to warbands - a flat jsonb array of
-- equipment ids, same shape as fighters.equipment. No new RLS
-- policies needed: it's just another column on warbands, already
-- covered by "warbands: owner can update".
-- ============================================================

alter table public.warbands
    add column stash jsonb not null default '[]'::jsonb;
