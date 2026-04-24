-- ============================================================
-- MIGRATION 9: Auto-create profile on signup + backfill existing users
--
-- Problem: posts.author_id → auth.users, not profiles, so PostgREST
-- can't join posts to profiles automatically. The fix in app code uses
-- two-query approach, but we also want every user to have a profile row
-- so the profiles table is always complete.
--
-- Paste into Supabase SQL Editor → Run.
-- ============================================================

-- 1. Trigger that auto-creates an empty profile when a new user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (NEW.id, '')
  on conflict (id) do nothing;
  return NEW;
end;
$$;

-- Create trigger on auth.users (Supabase SQL Editor has access to auth schema)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. Backfill: create a profile for any existing auth user who lacks one
insert into public.profiles (id, display_name)
select id, ''
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;
