-- ============================================================
-- MIGRATION 16: Topics taxonomy + per-post tagging
--
-- Admins manage a list of topics (Church, Ministry, Study, Action
-- seeded by default). Posts can be tagged with one or more topics.
--
-- Paste into Supabase SQL Editor → Run.
-- ============================================================

-- 1. Topics master table
create table if not exists topics (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  icon        text,         -- emoji
  color       text,         -- hex colour, e.g. '#003E7E'
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- 2. Post ↔ topic join table
create table if not exists post_topics (
  post_id  uuid not null references posts(id)   on delete cascade,
  topic_id uuid not null references topics(id)  on delete cascade,
  primary key (post_id, topic_id)
);

-- 3. Row-level security
alter table topics      enable row level security;
alter table post_topics enable row level security;

-- Any authenticated user can read topics
create policy "Authenticated users can read topics"
  on topics for select
  using (auth.uid() is not null);

-- Only admins can create / update / delete topics
create policy "Admins can manage topics"
  on topics for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- Any authenticated user can read post_topics
create policy "Authenticated users can read post_topics"
  on post_topics for select
  using (auth.uid() is not null);

-- Mods assigned to the post's forum can tag / untag topics
create policy "Assigned mods can manage post_topics"
  on post_topics for all
  using (
    exists (
      select 1 from posts p
      where p.id = post_id
        and can_moderate_forum(auth.uid(), p.forum_id)
    )
  )
  with check (
    exists (
      select 1 from posts p
      where p.id = post_id
        and can_moderate_forum(auth.uid(), p.forum_id)
    )
  );

-- 4. Seed the four starter topics (idempotent)
insert into topics (slug, name, icon, color, sort_order) values
  ('church',   'Church',   '⛪', '#003E7E', 1),
  ('ministry', 'Ministry', '🤝', '#7c3aed', 2),
  ('study',    'Study',    '📖', '#0891b2', 3),
  ('action',   'Action',   '⚡', '#c5a028', 4)
on conflict (slug) do nothing;
