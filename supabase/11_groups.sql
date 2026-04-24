-- ============================================================
-- MIGRATION 11: Groups, church-group membership, forum visibility
--
-- Adds:
--   1. groups table — admin-managed collections of churches
--   2. church_groups — which churches belong to each group (many-to-many)
--   3. forum_groups  — which groups can see each forum (many-to-many)
--      If a forum has NO rows in forum_groups it is visible to everyone.
--      If it HAS rows, only users whose church is in at least one of those
--      groups can see it.
--   4. user_can_see_forum(uid, fid) helper — used in RLS policies
--   5. Updated RLS on forums + posts to enforce group visibility
--
-- Paste into Supabase SQL Editor → Run.
-- ============================================================

-- 1. Groups
create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

alter table groups enable row level security;

create policy "Authenticated users can read groups"
  on groups for select
  using (auth.uid() is not null);

create policy "Admins can manage groups"
  on groups for insert
  with check (is_admin(auth.uid()));

create policy "Admins can update groups"
  on groups for update
  using (is_admin(auth.uid()));

create policy "Admins can delete groups"
  on groups for delete
  using (is_admin(auth.uid()));

-- 2. Church–group membership
create table if not exists church_groups (
  church_id uuid not null references churches(id) on delete cascade,
  group_id  uuid not null references groups(id)   on delete cascade,
  created_at timestamptz not null default now(),
  primary key (church_id, group_id)
);

alter table church_groups enable row level security;

create policy "Authenticated users can read church_groups"
  on church_groups for select
  using (auth.uid() is not null);

create policy "Admins can manage church_groups"
  on church_groups for insert
  with check (is_admin(auth.uid()));

create policy "Admins can delete church_groups"
  on church_groups for delete
  using (is_admin(auth.uid()));

-- 3. Forum–group visibility
create table if not exists forum_groups (
  forum_id uuid not null references forums(id) on delete cascade,
  group_id uuid not null references groups(id)  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (forum_id, group_id)
);

alter table forum_groups enable row level security;

create policy "Authenticated users can read forum_groups"
  on forum_groups for select
  using (auth.uid() is not null);

create policy "Admins can manage forum_groups"
  on forum_groups for insert
  with check (is_admin(auth.uid()));

create policy "Admins can delete forum_groups"
  on forum_groups for delete
  using (is_admin(auth.uid()));

-- 4. Helper: can this user see this forum?
--    Returns true when:
--      a) the forum has no group restrictions, OR
--      b) the user's church belongs to at least one allowed group, OR
--      c) the user is an admin / moderator (always full access)
create or replace function user_can_see_forum(uid uuid, fid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    is_moderator_or_admin(uid)
    or not exists (select 1 from forum_groups where forum_id = fid)
    or exists (
      select 1
      from   forum_groups  fg
      join   church_groups cg on cg.group_id  = fg.group_id
      join   profiles      p  on p.church_id  = cg.church_id
      where  fg.forum_id = fid
        and  p.id        = uid
    );
$$;

-- 5. Update forums SELECT policy to enforce group visibility
drop policy if exists "Logged-in non-banned users can read forums" on forums;
drop policy if exists "Anyone can read forums" on forums;

create policy "Users can read accessible forums"
  on forums for select
  using (
    auth.uid() is not null
    and not exists (select 1 from profiles where id = auth.uid() and is_banned)
    and user_can_see_forum(auth.uid(), id)
  );

-- 6. Update posts SELECT policy to enforce forum-level group visibility
drop policy if exists "Users can read posts" on posts;

create policy "Users can read posts"
  on posts for select
  using (
    auth.uid() is not null
    and not exists (select 1 from profiles where id = auth.uid()    and is_banned)
    and not exists (select 1 from profiles where id = author_id     and is_banned)
    and (not is_removed or is_moderator_or_admin(auth.uid()))
    and user_can_see_forum(auth.uid(), forum_id)
  );

-- Grant service role access to new tables (needed for admin API calls)
grant all on groups       to service_role;
grant all on church_groups to service_role;
grant all on forum_groups  to service_role;
grant select on groups        to anon, authenticated;
grant select on church_groups to anon, authenticated;
grant select on forum_groups  to anon, authenticated;
grant insert, delete on church_groups to authenticated;
grant insert, delete on forum_groups  to authenticated;
grant insert, update, delete on groups to authenticated;
