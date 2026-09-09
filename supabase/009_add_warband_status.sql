-- ============================================================
-- MORDEMANAGER - RETIRE / RECOVER WARBANDS
-- ============================================================
--
-- Lets a warband be retired (soft-deleted) instead of only ever
-- accumulating on the dashboard - useful for test warbands, or a
-- warband whose campaign has genuinely ended. Retired warbands are
-- hidden from the main list but can be recovered later; nothing is
-- actually deleted. Same status/check pattern already used on
-- games.status.
-- ============================================================

alter table public.warbands
    add column status text not null default 'active'
        check (status in ('active', 'retired'));
