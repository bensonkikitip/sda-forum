-- ============================================================
-- MIGRATION 15: Event metadata on posts
--
-- Any post can now optionally carry event information. A post is
-- considered "an event" iff event_starts_at is not null.
--
-- These columns are purely additive and nullable, so existing
-- posts remain unchanged and existing queries keep working.
--
-- Paste into Supabase SQL Editor → Run.
-- ============================================================

alter table posts
  add column if not exists event_starts_at    timestamptz,
  add column if not exists event_ends_at      timestamptz,
  add column if not exists event_location     text,
  add column if not exists event_location_url text;

-- Partial index for quickly pulling upcoming / past events without
-- scanning non-event rows.
create index if not exists posts_event_starts_idx
  on posts (event_starts_at)
  where event_starts_at is not null;
