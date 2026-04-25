-- ============================================================
-- MIGRATION 17: Topic notification preferences
--
-- 1. user_topic_preferences table — per-user opt-in for each topic,
--    with separate in-app and email switches. Default = opted out.
--
-- 2. create_post_with_topics RPC — atomically inserts a post and its
--    topic tags, then fans out notifications with topic filtering:
--    • posts WITH topics → only notify subscribers who have
--      notify_inapp = true for at least one matching topic.
--    • posts WITHOUT topics → notify all subscribers (legacy behaviour).
--
-- 3. Drop the old trg_fanout_new_post trigger — the RPC now handles
--    all fanout so the trigger is no longer needed.
--
-- Paste into Supabase SQL Editor → Run.
-- ============================================================

-- 1. User topic preferences
create table if not exists user_topic_preferences (
  user_id      uuid not null references auth.users(id) on delete cascade,
  topic_id     uuid not null references topics(id)     on delete cascade,
  notify_inapp boolean not null default true,
  notify_email boolean not null default false,
  created_at   timestamptz not null default now(),
  primary key (user_id, topic_id)
);

alter table user_topic_preferences enable row level security;

create policy "Users manage own topic prefs"
  on user_topic_preferences for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Atomic post + topics insert with topic-filtered fanout
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
returns uuid   -- the new post id
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
      -- No topics on this post → notify everyone subscribed (legacy).
      not has_topics
      or
      -- Topics present → only notify users opted into at least one.
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

-- 3. Drop the old per-row trigger — fanout is now done inside the RPC.
drop trigger if exists trg_fanout_new_post on posts;
