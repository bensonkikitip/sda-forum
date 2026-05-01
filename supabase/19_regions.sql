-- ============================================================
-- MIGRATION 19: Regions
--
-- Two-level org model: Region → Church.
-- Each church belongs to (at most) one region. Forums can be
-- scoped to one or more regions, in which case only members
-- whose church belongs to those regions auto-subscribe and can
-- see the forum.
--
-- Existing groups / church_groups / forum_groups stay intact —
-- they're for ad-hoc groupings (e.g. "youth ministry leaders").
-- Regions are an additional, simpler scoping layer.
--
-- Paste into Supabase SQL Editor → Run.
-- ============================================================

-- 1. Regions table ────────────────────────────────────────────
create table if not exists regions (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- 2. Churches belong to a region (nullable: not all churches have one yet) ──
alter table churches add column if not exists region_id uuid references regions(id);
create index if not exists churches_region_id_idx on churches(region_id);

-- 3. Forums can be scoped to one or more regions ──────────────
create table if not exists forum_regions (
  forum_id  uuid not null references forums(id)  on delete cascade,
  region_id uuid not null references regions(id) on delete cascade,
  primary key (forum_id, region_id)
);
create index if not exists forum_regions_region_idx on forum_regions(region_id);

-- 4. Update user_can_see_forum() ───────────────────────────────
-- A forum is visible if:
--   a) the user is admin (sees everything), OR
--   b) the forum has NO group AND NO region restrictions (open to all), OR
--   c) the user's church is in one of the forum's allowed groups, OR
--   d) the user's church is in one of the forum's allowed regions.
create or replace function user_can_see_forum(uid uuid, fid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    is_admin(uid)
    or (
      not exists (select 1 from forum_groups  where forum_id = fid)
      and not exists (select 1 from forum_regions where forum_id = fid)
    )
    or exists (
      -- group match
      select 1
      from   forum_groups  fg
      join   church_groups cg on cg.group_id  = fg.group_id
      join   profiles      p  on p.church_id  = cg.church_id
      where  fg.forum_id = fid
        and  p.id        = uid
    )
    or exists (
      -- region match
      select 1
      from   forum_regions fr
      join   churches      c on c.region_id = fr.region_id
      join   profiles      p on p.church_id = c.id
      where  fr.forum_id = fid
        and  p.id        = uid
    );
$$;

-- 5. Update auto_subscribe_to_forums() ─────────────────────────
-- Subscribe to every forum the user can now see:
--   a) no restrictions, OR
--   b) user's church is in an allowed group, OR
--   c) user's church is in a region the forum allows.
create or replace function auto_subscribe_to_forums()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (NEW.church_id is null) or (NEW.church_id is not distinct from OLD.church_id) then
    return NEW;
  end if;

  if TG_OP = 'UPDATE' and OLD.church_id is not null then
    delete from forum_subscriptions where user_id = NEW.id;
  end if;

  insert into forum_subscriptions (user_id, forum_id)
  select NEW.id, f.id
  from   forums f
  where
    -- a) no restrictions
    (
      not exists (select 1 from forum_groups  where forum_id = f.id)
      and not exists (select 1 from forum_regions where forum_id = f.id)
    )
    or
    -- b) user's church is in an allowed group
    exists (
      select 1
      from   forum_groups  fg
      join   church_groups cg on cg.group_id = fg.group_id
      where  fg.forum_id   = f.id
        and  cg.church_id  = NEW.church_id
    )
    or
    -- c) user's church is in a region the forum allows
    exists (
      select 1
      from   forum_regions fr
      join   churches      c on c.region_id = fr.region_id
      where  fr.forum_id = f.id
        and  c.id        = NEW.church_id
    )
  on conflict do nothing;

  return NEW;
end;
$$;

-- 6. Backfill subscriptions for existing users now that the rule expanded ──
-- Adds any region-scoped subscriptions that were missing. Existing rows
-- are kept (on conflict do nothing).
insert into forum_subscriptions (user_id, forum_id)
select p.id, f.id
from   profiles p
cross  join forums f
where  p.church_id is not null
  and  exists (
    select 1
    from   forum_regions fr
    join   churches      c on c.region_id = fr.region_id
    where  fr.forum_id = f.id
      and  c.id        = p.church_id
  )
on conflict do nothing;

-- 7. RLS — regions are world-readable (any logged-in user) ─────
alter table regions       enable row level security;
alter table forum_regions enable row level security;

drop policy if exists "Logged-in users can read regions" on regions;
create policy "Logged-in users can read regions"
  on regions for select
  using (auth.uid() is not null);

drop policy if exists "Admins can manage regions" on regions;
create policy "Admins can manage regions"
  on regions for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

drop policy if exists "Logged-in users can read forum_regions" on forum_regions;
create policy "Logged-in users can read forum_regions"
  on forum_regions for select
  using (auth.uid() is not null);

drop policy if exists "Admins can manage forum_regions" on forum_regions;
create policy "Admins can manage forum_regions"
  on forum_regions for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- 8. Grants ────────────────────────────────────────────────────
grant all    on regions       to service_role;
grant all    on forum_regions to service_role;
grant select on regions        to anon, authenticated;
grant select on forum_regions  to anon, authenticated;
grant insert, update, delete on regions       to authenticated;
grant insert, delete         on forum_regions to authenticated;
