-- ============================================================
-- MIGRATION 10: Notification system + forum subscriptions
--
-- Adds:
--   1. forum_subscriptions table — users can subscribe to a forum
--      and get an inbox notification on every new post in it.
--   2. Four email preference columns on profiles (opt-in per type).
--   3. 'forum_post' kind in inbox_messages.
--   4. Trigger on posts insert that fans out inbox notifications
--      to every subscriber (except the author, and skipping banned
--      users). Mirrors the fanout_announcement pattern.
--
-- Paste into Supabase SQL Editor → Run.
-- ============================================================

-- 1. Forum subscriptions table
create table if not exists forum_subscriptions (
  user_id    uuid not null references auth.users(id) on delete cascade,
  forum_id   uuid not null references forums(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, forum_id)
);

alter table forum_subscriptions enable row level security;

drop policy if exists "users read own subscriptions" on forum_subscriptions;
create policy "users read own subscriptions"
  on forum_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own subscriptions" on forum_subscriptions;
create policy "users insert own subscriptions"
  on forum_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "users delete own subscriptions" on forum_subscriptions;
create policy "users delete own subscriptions"
  on forum_subscriptions for delete
  using (auth.uid() = user_id);

-- 2. Email preferences (all default false — opt-in)
alter table profiles
  add column if not exists email_notify_replies        boolean not null default false,
  add column if not exists email_notify_mentions       boolean not null default false,
  add column if not exists email_notify_forum_subs     boolean not null default false,
  add column if not exists email_notify_announcements  boolean not null default false;

-- 3. Allow 'forum_post' as a valid inbox_messages.kind
alter table inbox_messages drop constraint if exists inbox_messages_kind_check;
alter table inbox_messages
  add constraint inbox_messages_kind_check
  check (kind in ('system', 'announcement', 'reply', 'mention', 'forum_post'));

-- 4. Fan-out trigger: on new post, notify every subscriber except the author
create or replace function fanout_new_post_to_subscribers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  forum_name text;
begin
  select name into forum_name from forums where id = NEW.forum_id;

  insert into inbox_messages (recipient_id, kind, title, body, link)
  select fs.user_id,
         'forum_post',
         'New post in ' || forum_name,
         NEW.title,
         '/posts/' || NEW.id::text
  from forum_subscriptions fs
  where fs.forum_id = NEW.forum_id
    and fs.user_id <> NEW.author_id
    and not is_banned(fs.user_id);

  return NEW;
end;
$$;

drop trigger if exists trg_fanout_new_post on posts;
create trigger trg_fanout_new_post
  after insert on posts
  for each row execute function fanout_new_post_to_subscribers();
