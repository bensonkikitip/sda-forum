-- ============================================================
-- MIGRATION 14: Moderators follow group visibility rules
--
-- Previously user_can_see_forum() gave ALL moderators full read
-- access to every forum (same as admins). This migration changes
-- that so moderators see forums based on their church/group
-- membership — exactly the same rules as regular members.
-- Only admins retain the blanket "see everything" bypass.
--
-- Paste into Supabase SQL Editor → Run.
-- ============================================================

create or replace function user_can_see_forum(uid uuid, fid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    is_admin(uid)                                           -- admins see everything
    or not exists (select 1 from forum_groups where forum_id = fid)  -- open forum
    or exists (                                             -- user's church is in an allowed group
      select 1
      from   forum_groups  fg
      join   church_groups cg on cg.group_id = fg.group_id
      join   profiles      p  on p.church_id = cg.church_id
      where  fg.forum_id = fid
        and  p.id        = uid
    );
$$;
