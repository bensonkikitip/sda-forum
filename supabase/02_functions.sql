-- ============================================================
-- MIGRATION 2 of 5: Helper SQL functions
-- Paste this entire file into the Supabase SQL Editor and click Run.
-- ============================================================

-- Returns true if the given user is an admin
create or replace function is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from user_roles where user_id = uid and role = 'admin'
  );
$$;

-- Returns true if the given user is a moderator or admin
create or replace function is_moderator_or_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from user_roles where user_id = uid and role in ('moderator', 'admin')
  );
$$;

-- Returns true if there is at least one open report for this content
create or replace function has_open_report(p_target_type text, p_target_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from reports
    where target_type = p_target_type
      and target_id   = p_target_id
      and status      = 'open'
  );
$$;
