-- Migration 20: announcement expiry + admin delete
-- Adds an optional expires_at column so announcements auto-hide from the
-- home page after the given timestamp, and lets admins hard-delete them.

-- 1. Add expires_at column (nullable = never expires)
alter table announcements
  add column if not exists expires_at timestamptz;

-- 2. Let admins delete announcements
create policy "Admins can delete announcements"
  on announcements for delete
  using (is_admin(auth.uid()));
