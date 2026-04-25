-- ============================================================
-- MIGRATION 18: Manual quarterly digest
--
--   1. Extend inbox_messages.kind to include 'digest'
--   2. Add email_notify_digest column to profiles (opt-in, default off)
--   3. Create digest_sends table with RLS
--   4. Helper functions for counting/fetching forum recipients
--
-- Paste into Supabase SQL Editor → Run.
-- Run after 17_notification_prefs.sql
-- ============================================================

-- 1. Extend the kind check constraint
alter table inbox_messages drop constraint if exists inbox_messages_kind_check;
alter table inbox_messages
  add constraint inbox_messages_kind_check
  check (kind in ('system', 'announcement', 'reply', 'mention', 'forum_post', 'digest'));

-- 2. New email preference column (opt-in, default false so existing users are not spammed)
alter table profiles
  add column if not exists email_notify_digest boolean not null default false;

-- 3. digest_sends: one row per digest send, used to show "last sent" info
--    and to render the recipient-facing /digest/[id] page.
create table if not exists digest_sends (
  id               uuid        primary key default gen_random_uuid(),
  -- Nullable so the record survives if the sender's account is deleted
  sent_by_user_id  uuid        references auth.users(id) on delete set null,
  scope            text        not null check (scope in ('site', 'forum')),
  forum_id         uuid        references forums(id) on delete cascade,
  recipient_count  int         not null default 0,
  window_start     timestamptz not null,
  window_end       timestamptz not null,
  sent_at          timestamptz not null default now(),

  -- Structural constraint: site rows have no forum; forum rows must have one
  constraint digest_scope_ck check (
    (scope = 'site'  and forum_id is null) or
    (scope = 'forum' and forum_id is not null)
  )
);

alter table digest_sends enable row level security;

-- Admins see every digest_sends row
create policy "admins read all digest sends"
  on digest_sends for select
  using (is_admin(auth.uid()));

-- Mods can see digest_sends for their assigned forums
create policy "mods read own forum digest sends"
  on digest_sends for select
  using (scope = 'forum' and can_moderate_forum(auth.uid(), forum_id));

-- Only admins may insert site-wide digest records
create policy "admin inserts site digest"
  on digest_sends for insert
  with check (
    scope = 'site'
    and is_admin(auth.uid())
    and sent_by_user_id = auth.uid()
  );

-- Mods may insert digest records for their assigned forums
create policy "mod inserts forum digest"
  on digest_sends for insert
  with check (
    scope = 'forum'
    and can_moderate_forum(auth.uid(), forum_id)
    and sent_by_user_id = auth.uid()
  );

-- 4. Helper: return the IDs of all non-banned users who can see a given forum.
--    Replicates user_can_see_forum logic with a pure JOIN query (no N+1).
--    Called by the server action via admin client, so security definer is safe.
create or replace function get_forum_recipient_ids(p_forum_id uuid)
returns table(user_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select p.id as user_id
  from profiles p
  where not p.is_banned
    and (
      -- admins can always see every forum
      exists (
        select 1 from user_roles ur
        where ur.user_id = p.id and ur.role = 'admin'
      )
      -- open forum (no group restrictions)
      or not exists (
        select 1 from forum_groups fg
        where fg.forum_id = p_forum_id
      )
      -- user's church belongs to one of the forum's groups
      or exists (
        select 1
        from   forum_groups  fg
        join   church_groups cg on cg.group_id = fg.group_id
        where  fg.forum_id = p_forum_id
          and  cg.church_id = p.church_id
      )
    );
$$;

-- 5. Helper: count recipients — convenience wrapper around the above
create or replace function count_forum_recipients(p_forum_id uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*) from get_forum_recipient_ids(p_forum_id);
$$;
