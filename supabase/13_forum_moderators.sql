-- ============================================================
-- MIGRATION 13: Per-forum moderator assignments
-- Run in Supabase SQL Editor after 12_auto_subscribe.sql
-- ============================================================

-- 1. Table: which moderators are assigned to which forums
create table if not exists forum_moderators (
  user_id    uuid not null references auth.users(id) on delete cascade,
  forum_id   uuid not null references forums(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, forum_id)
);

alter table forum_moderators enable row level security;

-- Only admins can manage assignments; admin client bypasses RLS for reads
create policy "Admins can manage forum moderators"
  on forum_moderators for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- 2. New helper: true if uid is admin, OR is a moderator assigned to fid
create or replace function can_moderate_forum(uid uuid, fid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    is_admin(uid)
    or (
      exists (select 1 from user_roles where user_id = uid and role = 'moderator')
      and exists (select 1 from forum_moderators where user_id = uid and forum_id = fid)
    );
$$;

-- 3. Update posts policies ------------------------------------------------
-- Posts can now only be created/updated/deleted by admins or mods assigned
-- to that specific forum.

-- INSERT: replace the blanket "non-banned users can create posts" with one
-- that requires forum-specific mod access.
drop policy if exists "Non-banned users can create posts" on posts;

create policy "Assigned mods and admins can create posts"
  on posts for insert
  with check (
    author_id = auth.uid()
    and not (exists (select 1 from profiles where id = auth.uid() and is_banned))
    and can_moderate_forum(auth.uid(), forum_id)
  );

-- UPDATE: replace the blanket mod policy
drop policy if exists "Mods can update any post" on posts;

create policy "Assigned mods and admins can update posts"
  on posts for update
  using (can_moderate_forum(auth.uid(), forum_id));

-- DELETE: replace the blanket mod policy
drop policy if exists "Authors or mods can delete posts" on posts;

create policy "Authors or assigned mods can delete posts"
  on posts for delete
  using (
    author_id = auth.uid()
    or can_moderate_forum(auth.uid(), forum_id)
  );

-- 4. Update comments policies ---------------------------------------------
-- For comments we have no direct forum_id; we join through the parent post.

drop policy if exists "Mods can update any comment" on comments;

create policy "Assigned mods and admins can update comments"
  on comments for update
  using (
    author_id = auth.uid()
    or is_admin(auth.uid())
    or (
      exists (select 1 from user_roles where user_id = auth.uid() and role = 'moderator')
      and exists (
        select 1 from posts p
        join forum_moderators fm
          on fm.forum_id = p.forum_id and fm.user_id = auth.uid()
        where p.id = post_id
      )
    )
  );

drop policy if exists "Authors or mods can delete comments" on comments;

create policy "Authors or assigned mods can delete comments"
  on comments for delete
  using (
    author_id = auth.uid()
    or is_admin(auth.uid())
    or (
      exists (select 1 from user_roles where user_id = auth.uid() and role = 'moderator')
      and exists (
        select 1 from posts p
        join forum_moderators fm
          on fm.forum_id = p.forum_id and fm.user_id = auth.uid()
        where p.id = post_id
      )
    )
  );
