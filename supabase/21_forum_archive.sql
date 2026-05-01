-- ============================================================
-- MIGRATION 21: Soft-delete (archive) for forums, regions, and groups
--
-- Adds is_archived to forums, regions, and groups. Archived forums:
--   • are hidden from all regular-client queries via user_can_see_forum()
--   • still allow posts to be read via direct link (/posts/[id])
--   • block new posts at the RPC level (no user level may post)
--   • are visible to admins only through the admin panel (admin client
--     bypasses RLS entirely)
--
-- Archived regions and groups:
--   • are hidden from active admin lists (shown in a separate section)
--   • do NOT affect existing forum visibility or member subscriptions
--   • are purely an admin workflow tool — reversible at any time
--
-- Paste into Supabase SQL Editor → Run.
-- ============================================================

-- 1. Add is_archived columns ──────────────────────────────────
alter table forums
  add column if not exists is_archived boolean not null default false;

alter table regions
  add column if not exists is_archived boolean not null default false;

alter table groups
  add column if not exists is_archived boolean not null default false;

-- 2. Update user_can_see_forum() ──────────────────────────────
-- Short-circuit: archived forums return false for everyone using
-- the regular client. Admins see them only via the admin client
-- (createAdminClient bypasses RLS).
create or replace function user_can_see_forum(uid uuid, fid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    -- Archived forums are invisible via the regular client
    not coalesce((select is_archived from forums where id = fid), false)
    and (
      is_admin(uid)
      or (
        not exists (select 1 from forum_groups  where forum_id = fid)
        and not exists (select 1 from forum_regions where forum_id = fid)
      )
      or exists (
        -- group match
        select 1
        from   forum_groups  fg
        join   church_groups cg on cg.group_id  = fg.group_id
        join   profiles      p  on p.church_id  = cg.church_id
        where  fg.forum_id = fid
          and  p.id        = uid
      )
      or exists (
        -- region match
        select 1
        from   forum_regions fr
        join   churches      c on c.region_id = fr.region_id
        join   profiles      p on p.church_id = c.id
        where  fr.forum_id = fid
          and  p.id        = uid
      )
    );
$$;

-- 3. Update create_post_with_topics() ─────────────────────────
-- Block posting in archived forums for every user level.
create or replace function create_post_with_topics(
  p_forum_id           uuid,
  p_title              text,
  p_body_md            text,
  p_event_starts_at    timestamptz default null,
  p_event_ends_at      timestamptz default null,
  p_event_location     text        default null,
  p_event_location_url text        default null,
  p_topic_ids          uuid[]      default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_post_id  uuid;
  v_forum_name text;
  has_topics   boolean;
begin
  -- Must be admin or moderator assigned to this forum.
  if not can_moderate_forum(auth.uid(), p_forum_id) then
    raise exception 'Not authorized to post in this forum';
  end if;

  -- Block posting in archived forums — no user level may post.
  if (select coalesce(is_archived, false) from forums where id = p_forum_id) then
    raise exception 'This group is archived — new posts are not allowed';
  end if;

  -- Insert the post.
  insert into posts (
    forum_id, author_id, title, body_md,
    event_starts_at, event_ends_at, event_location, event_location_url
  )
  values (
    p_forum_id, auth.uid(), p_title, p_body_md,
    p_event_starts_at, p_event_ends_at, p_event_location, p_event_location_url
  )
  returning id into new_post_id;

  -- Insert topic tags.
  has_topics := p_topic_ids is not null and array_length(p_topic_ids, 1) > 0;
  if has_topics then
    insert into post_topics (post_id, topic_id)
    select new_post_id, unnest(p_topic_ids);
  end if;

  -- Fan out inbox notifications.
  select name into v_forum_name from forums where id = p_forum_id;

  insert into inbox_messages (recipient_id, kind, title, body, link)
  select
    fs.user_id,
    'forum_post',
    'New post in ' || v_forum_name,
    p_title,
    '/posts/' || new_post_id::text
  from forum_subscriptions fs
  join profiles prof on prof.id = fs.user_id and not prof.is_banned
  where fs.forum_id = p_forum_id
    and fs.user_id <> auth.uid()
    and (
      not has_topics
      or
      exists (
        select 1
        from unnest(p_topic_ids) as t(tid)
        join user_topic_preferences utp
          on utp.topic_id      = t.tid
         and utp.user_id       = fs.user_id
         and utp.notify_inapp  = true
      )
    );

  return new_post_id;
end;
$$;
