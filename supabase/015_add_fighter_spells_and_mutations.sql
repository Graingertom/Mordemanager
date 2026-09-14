-- ============================================================
-- MORDEMANAGER - FIGHTER SPELLS AND MUTATIONS
-- ============================================================
--
-- spells: known spells for a wizard-type fighter (Magister,
-- Warrior-Priest, Sigmarite Matriarch, Necromancer, Eshin
-- Sorcerer) - {id, name, difficulty, effect, dateKnown} entries,
-- recorded the same way skills already are (a roster change, not
-- a battle event - see js/fighters.js's Spells section in
-- showEditFighter).
--
-- mutations: purchased mutations for a Mutant or Possessed fighter
-- - {id, name, cost, effect} entries, bought only at recruitment
-- per the rulebook (js/fighters.js's recruit flow enforces this by
-- only offering the picker there, not on an existing fighter).
-- ============================================================

alter table public.fighters
    add column spells jsonb not null default '[]'::jsonb,
    add column mutations jsonb not null default '[]'::jsonb;
