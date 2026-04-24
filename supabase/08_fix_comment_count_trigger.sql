-- ============================================================
-- MIGRATION 8: Fix comment_count for soft-deletes
-- The original trigger only fires on hard DELETE, but comments are
-- soft-deleted by setting is_removed = true. This patch adds an
-- UPDATE handler so the count stays accurate.
--
-- Paste into Supabase SQL Editor → Run.
-- ============================================================

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

  elsif TG_OP = 'UPDATE' then
    -- Soft-delete: is_removed flipped false → true
    if OLD.is_removed = false and NEW.is_removed = true then
      update posts set comment_count = greatest(comment_count - 1, 0) where id = NEW.post_id;
    -- Un-remove: is_removed flipped true → false (future use)
    elsif OLD.is_removed = true and NEW.is_removed = false then
      update posts set comment_count = comment_count + 1 where id = NEW.post_id;
    end if;

  end if;
  return null;
end;
$$;

-- Re-create trigger to also fire on UPDATE of is_removed
drop trigger if exists trg_comment_count on comments;

create trigger trg_comment_count
  after insert or delete or update of is_removed on comments
  for each row execute function update_comment_count();
