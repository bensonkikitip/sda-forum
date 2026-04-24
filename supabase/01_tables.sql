-- ============================================================
-- MIGRATION 1 of 5: All table definitions
-- Paste this entire file into the Supabase SQL Editor and click Run.
-- ============================================================

-- Fast text search for church picker
create extension if not exists pg_trgm;

-- ── user_roles ──────────────────────────────────────────────
-- Must be created before profiles/churches so RLS policies can reference it
create table if not exists user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  created_at timestamptz not null default now()
);
alter table user_roles enable row level security;

-- ── churches ────────────────────────────────────────────────
create table if not exists churches (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  country    text,
  region     text,
  created_at timestamptz not null default now()
);
create index if not exists churches_name_trgm_idx on churches using gin (name gin_trgm_ops);
alter table churches enable row level security;

-- ── profiles ────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default '',
  avatar_url    text,
  date_of_birth date,
  gender        text,
  country       text,
  region        text,
  church_id     uuid references churches(id) on delete set null,
  dm_opt_in     boolean not null default true,
  is_banned     boolean not null default false,
  created_at    timestamptz not null default now()
);
alter table profiles enable row level security;

-- ── forums ──────────────────────────────────────────────────
create table if not exists forums (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text,
  icon        text,             -- emoji or lucide icon name
  color       text,             -- hex colour e.g. #3b82f6
  is_private  boolean not null default false,  -- reserved for future use
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table forums enable row level security;

-- ── posts ───────────────────────────────────────────────────
create table if not exists posts (
  id            uuid primary key default gen_random_uuid(),
  forum_id      uuid not null references forums(id) on delete cascade,
  author_id     uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  body_md       text not null default '',
  is_pinned     boolean not null default false,
  is_locked     boolean not null default false,
  is_removed    boolean not null default false,
  removed_by    uuid references auth.users(id) on delete set null,
  removed_at    timestamptz,
  comment_count int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists posts_forum_feed_idx on posts (forum_id, is_pinned desc, created_at desc);
create index if not exists posts_forum_top_idx  on posts (forum_id, comment_count desc);
alter table posts enable row level security;

-- ── post_images ─────────────────────────────────────────────
create table if not exists post_images (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references posts(id) on delete cascade,
  storage_path text not null,   -- path inside the post-images bucket
  position     int not null default 0,
  created_at   timestamptz not null default now()
);
alter table post_images enable row level security;

-- ── comments ────────────────────────────────────────────────
create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  parent_id  uuid references comments(id) on delete cascade,  -- null = top-level
  author_id  uuid not null references auth.users(id) on delete cascade,
  body_md    text not null,
  is_removed boolean not null default false,
  removed_by uuid references auth.users(id) on delete set null,
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on comments (post_id, created_at);
alter table comments enable row level security;

-- ── reports ─────────────────────────────────────────────────
create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id   uuid not null,
  reason      text,
  status      text not null default 'open' check (status in ('open', 'approved', 'removed')),
  handled_by  uuid references auth.users(id) on delete set null,
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists reports_target_idx on reports (target_type, target_id, status);
create index if not exists reports_status_idx on reports (status, created_at desc);
alter table reports enable row level security;

-- ── inbox_messages ───────────────────────────────────────────
create table if not exists inbox_messages (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('system', 'announcement', 'reply', 'mention')),
  title        text,
  body         text,
  link         text,     -- e.g. /posts/<id>
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists inbox_recipient_idx on inbox_messages (recipient_id, read_at, created_at desc);
alter table inbox_messages enable row level security;

-- ── direct_message_threads ───────────────────────────────────
create table if not exists direct_message_threads (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid not null references auth.users(id) on delete cascade,
  user_b          uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz,
  created_at      timestamptz not null default now()
);
-- Ensure only one thread per pair, regardless of who is user_a vs user_b
create unique index if not exists dm_threads_pair_idx
  on direct_message_threads (
    least(user_a::text, user_b::text),
    greatest(user_a::text, user_b::text)
  );
alter table direct_message_threads enable row level security;

-- ── dm_messages ──────────────────────────────────────────────
create table if not exists dm_messages (
  id        uuid primary key default gen_random_uuid(),
  thread_id uuid not null references direct_message_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body      text not null,
  read_at   timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists dm_thread_idx on dm_messages (thread_id, created_at);
alter table dm_messages enable row level security;

-- ── announcements ────────────────────────────────────────────
create table if not exists announcements (
  id        uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title     text not null,
  body_md   text not null,
  created_at timestamptz not null default now()
);
alter table announcements enable row level security;

-- ── bans ─────────────────────────────────────────────────────
create table if not exists bans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique not null references auth.users(id) on delete cascade,
  banned_by  uuid references auth.users(id) on delete set null,
  reason     text,
  created_at timestamptz not null default now()
);
alter table bans enable row level security;
