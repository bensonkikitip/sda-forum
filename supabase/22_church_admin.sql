-- ============================================================
-- MIGRATION 22: Church admin delete policy
-- Paste this entire file into the Supabase SQL Editor and click Run.
-- ============================================================

-- Allow admins to delete churches.
-- The UI enforces a member-count guard before calling delete,
-- so this policy is the DB-level enabler only.
create policy "Admins can delete churches"
  on churches for delete
  using (is_admin(auth.uid()));
