-- ============================================================
-- MIGRATION 4 of 5: Triggers (automatic background actions)
-- Paste this entire file into the Supabase SQL Editor and click Run.
-- RUN AFTER 01_tables.sql, 02_functions.sql, 03_rls_policies.sql
-- ============================================================

-- ── Increment/decrement comment_count on posts ───────────────
create or replace function update_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set comment_count = greatest(comment_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

create trigger trg_comment_count
  after insert or delete on comments
  for each row execute function update_comment_count();

-- ── Sync is_banned on profiles when a ban is inserted/deleted ─
create or replace function sync_ban_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set is_banned = true  where id = NEW.user_id;
  elsif TG_OP = 'DELETE' then
    update profiles set is_banned = false where id = OLD.user_id;
  end if;
  return null;
end;
$$;

create trigger trg_sync_ban
  after insert or delete on bans
  for each row execute function sync_ban_to_profile();

-- ── Fan-out announcements to all active users' inboxes ────────
create or replace function fanout_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into inbox_messages (recipient_id, kind, title, body, link)
  select p.id, 'announcement', NEW.title, NEW.body_md, null
  from profiles p
  where not p.is_banned;
  return null;
end;
$$;

create trigger trg_announcement_fanout
  after insert on announcements
  for each row execute function fanout_announcement();

-- ── Notify post author when someone comments on their post ────
create or replace function notify_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_author uuid;
  v_post_title  text;
begin
  select author_id, title into v_post_author, v_post_title
  from posts where id = NEW.post_id;

  -- Don't notify if the commenter is the post author
  if v_post_author is null or v_post_author = NEW.author_id then
    return null;
  end if;

  insert into inbox_messages (recipient_id, kind, title, body, link)
  values (
    v_post_author,
    'reply',
    'New comment on "' || v_post_title || '"',
    null,
    '/posts/' || NEW.post_id
  );
  return null;
end;
$$;

create trigger trg_reply_notification
  after insert on comments
  for each row execute function notify_reply();

-- ── Update last_message_at on DM thread when a message is sent
create or replace function update_thread_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update direct_message_threads
  set last_message_at = NEW.created_at
  where id = NEW.thread_id;
  return null;
end;
$$;

create trigger trg_dm_thread_timestamp
  after insert on dm_messages
  for each row execute function update_thread_timestamp();
