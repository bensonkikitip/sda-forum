-- ============================================================
-- MIGRATION 3 of 5: Row Level Security policies
-- Paste this entire file into the Supabase SQL Editor and click Run.
-- RUN AFTER 01_tables.sql and 02_functions.sql
-- ============================================================

-- ── user_roles ──────────────────────────────────────────────
create policy "Logged-in users can read all roles"
  on user_roles for select
  using (auth.uid() is not null);

create policy "Admins can manage roles"
  on user_roles for insert
  with check (is_admin(auth.uid()));

create policy "Admins can update roles"
  on user_roles for update
  using (is_admin(auth.uid()));

create policy "Admins can delete roles"
  on user_roles for delete
  using (is_admin(auth.uid()));

-- ── churches ────────────────────────────────────────────────
create policy "Logged-in users can read churches"
  on churches for select
  using (auth.uid() is not null);

create policy "Admins can manage churches"
  on churches for insert
  with check (is_admin(auth.uid()));

create policy "Admins can update churches"
  on churches for update
  using (is_admin(auth.uid()));

-- ── profiles ────────────────────────────────────────────────
-- Users see their own profile and any non-banned profile
create policy "Users can read non-banned profiles"
  on profiles for select
  using (
    auth.uid() is not null
    and (id = auth.uid() or not is_banned)
  );

create policy "Users create their own profile"
  on profiles for insert
  with check (id = auth.uid());

create policy "Users update their own profile"
  on profiles for update
  using (id = auth.uid());

-- Admins can update any profile (e.g. set is_banned via the bans trigger)
create policy "Admins can update any profile"
  on profiles for update
  using (is_admin(auth.uid()));

-- ── forums ──────────────────────────────────────────────────
create policy "Logged-in users can read forums"
  on forums for select
  using (auth.uid() is not null and not (
    exists (select 1 from profiles where id = auth.uid() and is_banned)
  ));

create policy "Admins can manage forums"
  on forums for insert
  with check (is_admin(auth.uid()));

create policy "Admins can update forums"
  on forums for update
  using (is_admin(auth.uid()));

create policy "Admins can delete forums"
  on forums for delete
  using (is_admin(auth.uid()));

-- ── posts ───────────────────────────────────────────────────
-- Select: logged-in, not banned, author not banned, not removed (unless mod/admin)
create policy "Users can read visible posts"
  on posts for select
  using (
    auth.uid() is not null
    and not (exists (select 1 from profiles where id = auth.uid() and is_banned))
    and not (exists (select 1 from profiles where id = author_id and is_banned))
    and (not is_removed or is_moderator_or_admin(auth.uid()))
  );

-- Insert: logged-in and not banned
create policy "Non-banned users can create posts"
  on posts for insert
  with check (
    author_id = auth.uid()
    and not (exists (select 1 from profiles where id = auth.uid() and is_banned))
  );

-- Authors can edit their own post body (not locked/pinned/removed flags)
create policy "Authors can edit their own posts"
  on posts for update
  using (author_id = auth.uid() and not is_locked);

-- Mods/admins can update any post (lock, pin, remove)
create policy "Mods can update any post"
  on posts for update
  using (is_moderator_or_admin(auth.uid()));

-- Authors or mods can delete
create policy "Authors or mods can delete posts"
  on posts for delete
  using (author_id = auth.uid() or is_moderator_or_admin(auth.uid()));

-- ── post_images ─────────────────────────────────────────────
create policy "Users can read post images"
  on post_images for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from posts p
      where p.id = post_id
        and not p.is_removed
        and not (exists (select 1 from profiles where id = p.author_id and is_banned))
    )
  );

create policy "Post authors can add images"
  on post_images for insert
  with check (
    exists (
      select 1 from posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

create policy "Post authors or mods can delete images"
  on post_images for delete
  using (
    exists (
      select 1 from posts p
      where p.id = post_id
        and (p.author_id = auth.uid() or is_moderator_or_admin(auth.uid()))
    )
  );

-- ── comments ────────────────────────────────────────────────
create policy "Users can read visible comments"
  on comments for select
  using (
    auth.uid() is not null
    and not (exists (select 1 from profiles where id = auth.uid() and is_banned))
    and not (exists (select 1 from profiles where id = author_id and is_banned))
    and (not is_removed or is_moderator_or_admin(auth.uid()))
  );

create policy "Non-banned users can comment"
  on comments for insert
  with check (
    author_id = auth.uid()
    and not (exists (select 1 from profiles where id = auth.uid() and is_banned))
  );

create policy "Authors can edit own comments"
  on comments for update
  using (author_id = auth.uid());

create policy "Mods can update any comment"
  on comments for update
  using (is_moderator_or_admin(auth.uid()));

create policy "Authors or mods can delete comments"
  on comments for delete
  using (author_id = auth.uid() or is_moderator_or_admin(auth.uid()));

-- ── reports ─────────────────────────────────────────────────
create policy "Reporters and mods can read reports"
  on reports for select
  using (
    auth.uid() is not null
    and (reporter_id = auth.uid() or is_moderator_or_admin(auth.uid()))
  );

create policy "Non-banned users can report"
  on reports for insert
  with check (
    reporter_id = auth.uid()
    and not (exists (select 1 from profiles where id = auth.uid() and is_banned))
  );

create policy "Mods can update report status"
  on reports for update
  using (is_moderator_or_admin(auth.uid()));

-- ── inbox_messages ───────────────────────────────────────────
create policy "Users read their own inbox"
  on inbox_messages for select
  using (recipient_id = auth.uid());

-- Only the service role (admin API) can insert inbox messages
-- Regular users get notifications via triggers, not direct inserts
create policy "Admins can send inbox messages"
  on inbox_messages for insert
  with check (is_admin(auth.uid()));

create policy "Users can mark messages read"
  on inbox_messages for update
  using (recipient_id = auth.uid());

-- ── direct_message_threads ───────────────────────────────────
create policy "Participants can read their threads"
  on direct_message_threads for select
  using (auth.uid() in (user_a, user_b));

create policy "Logged-in users can start DM threads"
  on direct_message_threads for insert
  with check (
    auth.uid() in (user_a, user_b)
    and not (exists (select 1 from profiles where id = auth.uid() and is_banned))
    -- recipient must have DMs enabled
    and exists (
      select 1 from profiles
      where id = case when user_a = auth.uid() then user_b else user_a end
        and dm_opt_in = true
        and not is_banned
    )
  );

-- ── dm_messages ──────────────────────────────────────────────
create policy "Participants can read DM messages"
  on dm_messages for select
  using (
    exists (
      select 1 from direct_message_threads t
      where t.id = thread_id and auth.uid() in (t.user_a, t.user_b)
    )
  );

create policy "Participants can send DM messages"
  on dm_messages for insert
  with check (
    sender_id = auth.uid()
    and not (exists (select 1 from profiles where id = auth.uid() and is_banned))
    and exists (
      select 1 from direct_message_threads t
      where t.id = thread_id and auth.uid() in (t.user_a, t.user_b)
    )
  );

create policy "Recipients can mark messages read"
  on dm_messages for update
  using (
    exists (
      select 1 from direct_message_threads t
      where t.id = thread_id
        and auth.uid() in (t.user_a, t.user_b)
        and sender_id != auth.uid()
    )
  );

-- ── announcements ────────────────────────────────────────────
create policy "Logged-in users can read announcements"
  on announcements for select
  using (auth.uid() is not null);

create policy "Admins can create announcements"
  on announcements for insert
  with check (is_admin(auth.uid()));

create policy "Admins can delete announcements"
  on announcements for delete
  using (is_admin(auth.uid()));

-- ── bans ─────────────────────────────────────────────────────
create policy "Mods and admins can read bans"
  on bans for select
  using (is_moderator_or_admin(auth.uid()));

create policy "Admins can ban users"
  on bans for insert
  with check (is_admin(auth.uid()));

create policy "Admins can unban users"
  on bans for delete
  using (is_admin(auth.uid()));
