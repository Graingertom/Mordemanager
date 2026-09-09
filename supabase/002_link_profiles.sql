-- ============================================================
-- MORDEMANAGER - LINK OWNER/GM TO PROFILES
-- ============================================================
--
-- Run this in the SQL Editor after schema.sql. Safe to run now -
-- no warband/game data exists yet, so there's nothing to migrate.
--
-- Why: warbands.owner_id and games.game_master_id currently point
-- at auth.users, which PostgREST cannot join against directly (it
-- isn't exposed the way public.profiles is). Repointing them at
-- profiles.id instead (profiles.id already IS the same uuid as
-- the auth.users row, 1:1, kept in sync by the on_auth_user_created
-- trigger) lets a single query pull back the owner/GM's display
-- name via PostgREST's automatic embedding, e.g.
-- `.select('*, owner:profiles(display_name)')`, instead of a
-- separate lookup per warband/game.
-- ============================================================

alter table public.warbands
    drop constraint warbands_owner_id_fkey,
    add constraint warbands_owner_id_fkey
        foreign key (owner_id)
        references public.profiles(id)
        on delete cascade;

alter table public.games
    drop constraint games_game_master_id_fkey,
    add constraint games_game_master_id_fkey
        foreign key (game_master_id)
        references public.profiles(id)
        on delete cascade;
