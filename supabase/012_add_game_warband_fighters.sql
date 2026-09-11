-- ============================================================
-- MORDEMANAGER - READ-ONLY GAME OUTCOME FOR OTHER PARTICIPANTS
-- ============================================================
--
-- Lets any participant in a game (its GM, or the owner of a
-- different warband also in that game) see the injuries,
-- experience and skills recorded for a warband they don't own,
-- as long as that warband is actually in the same game. Never
-- exposes treasury, equipment or stash - this is specifically the
-- "what happened to them in this game" view, not full warband
-- detail (that stays owner-only, same as it always has).
--
-- Same safe pattern as search_warbands/get_friend_warbands: a
-- standalone security definer function called directly by the
-- client, never referenced from inside another table's RLS
-- policy, so it can't become part of the recursion graph fixed in
-- 006/007/010/011. No changes to warbands'/fighters' own RLS.
-- ============================================================

create or replace function public.get_game_warband_fighters(
    target_warband_id uuid,
    target_game_id uuid
)
returns table (
    id uuid,
    name text,
    category text,
    type_name text,
    experience integer,
    injuries jsonb,
    skills jsonb
)
language sql
security definer
set search_path = public
as $$
    select f.id, f.name, f.category, f.type_name, f.experience, f.injuries, f.skills
    from public.fighters f
    where f.warband_id = target_warband_id
      and exists (
          select 1 from public.game_warbands gw
          where gw.warband_id = target_warband_id
            and gw.game_id = target_game_id
      )
      and (
          exists (
              select 1 from public.games g
              where g.id = target_game_id
                and g.game_master_id = auth.uid()
          )
          or exists (
              select 1
              from public.game_warbands gw2
              join public.warbands w on w.id = gw2.warband_id
              where gw2.game_id = target_game_id
                and w.owner_id = auth.uid()
          )
      );
$$;

revoke all on function public.get_game_warband_fighters(uuid, uuid) from public;
grant execute on function public.get_game_warband_fighters(uuid, uuid) to authenticated;
