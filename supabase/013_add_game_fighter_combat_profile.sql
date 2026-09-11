-- ============================================================
-- MORDEMANAGER - READ-ONLY COMBAT PROFILE FOR OTHER PARTICIPANTS
-- ============================================================
--
-- Lets any participant in a game (its GM, or the owner of a
-- different warband also in that game) see one specific fighter's
-- profile and equipment, as long as that fighter's warband is
-- actually in the same game - needed for the Combat Calculator to
-- compute To Hit / To Wound / Armour Save against a real opponent,
-- not just your own fighters.
--
-- get_game_warband_fighters (012) deliberately excludes profile
-- and equipment ("Never exposes treasury, equipment or stash" -
-- that RPC is for the "what happened to them" read-only view).
-- This is a separate, narrowly-scoped function for exactly the new
-- surface area the calculator needs, rather than widening 012 and
-- silently changing what the existing read-only view exposes.
--
-- Same safe pattern as every cross-user read this session: a
-- standalone security definer function called directly by the
-- client, never referenced from inside another table's RLS policy.
-- ============================================================

create or replace function public.get_game_fighter_combat_profile(
    target_fighter_id uuid,
    target_game_id uuid
)
returns table (
    id uuid,
    name text,
    category text,
    type_name text,
    profile jsonb,
    equipment jsonb
)
language sql
security definer
set search_path = public
as $$
    select f.id, f.name, f.category, f.type_name, f.profile, f.equipment
    from public.fighters f
    join public.warbands w on w.id = f.warband_id
    where f.id = target_fighter_id
      and exists (
          select 1 from public.game_warbands gw
          where gw.warband_id = w.id
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
              join public.warbands w2 on w2.id = gw2.warband_id
              where gw2.game_id = target_game_id
                and w2.owner_id = auth.uid()
          )
      );
$$;

revoke all on function public.get_game_fighter_combat_profile(uuid, uuid) from public;
grant execute on function public.get_game_fighter_combat_profile(uuid, uuid) to authenticated;
