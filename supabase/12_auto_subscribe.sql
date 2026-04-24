-- ============================================================
-- MIGRATION 12: Auto-subscribe users to visible forums
--
-- Fires when a profile's church_id is set (onboarding) or changed
-- (profile edit). Subscribes the user to every forum they can see
-- based on their church's group memberships.
--
-- On church change: removes old subscriptions and rebuilds them so
-- the user is never subscribed to forums they can no longer access.
--
-- Paste into Supabase SQL Editor → Run.
-- ============================================================

create or replace function auto_subscribe_to_forums()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only act when church_id is being set or changed
  if (NEW.church_id is null) or (NEW.church_id is not distinct from OLD.church_id) then
    return NEW;
  end if;

  -- If the church changed, remove all existing forum subscriptions so we
  -- can rebuild them cleanly (avoids keeping access to now-restricted forums)
  if TG_OP = 'UPDATE' and OLD.church_id is not null then
    delete from forum_subscriptions where user_id = NEW.id;
  end if;

  -- Subscribe to every forum the user can now see:
  --   a) forums with no group restrictions (visible to everyone), OR
  --   b) forums where the user's new church belongs to at least one allowed group
  insert into forum_subscriptions (user_id, forum_id)
  select NEW.id, f.id
  from   forums f
  where
    -- a) no restrictions
    not exists (select 1 from forum_groups where forum_id = f.id)
    or
    -- b) user's church is in an allowed group
    exists (
      select 1
      from   forum_groups  fg
      join   church_groups cg on cg.group_id = fg.group_id
      where  fg.forum_id   = f.id
        and  cg.church_id  = NEW.church_id
    )
  on conflict do nothing;

  return NEW;
end;
$$;

-- Fire after insert (onboarding) and after update (profile edit)
drop trigger if exists trg_auto_subscribe_forums on profiles;
create trigger trg_auto_subscribe_forums
  after insert or update of church_id on profiles
  for each row execute function auto_subscribe_to_forums();

-- ── Backfill existing users ──────────────────────────────────
-- Subscribe every current user who already has a church set but
-- hasn't been auto-subscribed yet.
insert into forum_subscriptions (user_id, forum_id)
select p.id, f.id
from   profiles p
cross  join forums f
where  p.church_id is not null
  and  (
    not exists (select 1 from forum_groups where forum_id = f.id)
    or exists (
      select 1
      from   forum_groups  fg
      join   church_groups cg on cg.group_id = fg.group_id
      where  fg.forum_id  = f.id
        and  cg.church_id = p.church_id
    )
  )
on conflict do nothing;
