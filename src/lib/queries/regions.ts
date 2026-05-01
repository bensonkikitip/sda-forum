import { createClient, createAdminClient } from '@/lib/supabase/server'

export type Region = {
  id: string
  slug: string
  name: string
  description: string | null
  created_at: string
}

export async function getAllRegions(): Promise<Region[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('regions')
    .select('id, slug, name, description, created_at')
    .order('name')
  return (data ?? []) as Region[]
}

export async function getRegionById(id: string): Promise<Region | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('regions')
    .select('id, slug, name, description, created_at')
    .eq('id', id)
    .maybeSingle()
  return (data as Region | null) ?? null
}

/**
 * Returns the region a given church belongs to, or null if the church has no
 * region assigned (or doesn't exist).
 */
export async function getRegionForChurch(
  churchId: string,
): Promise<Region | null> {
  const supabase = await createClient()
  const { data: church } = await supabase
    .from('churches')
    .select('region_id')
    .eq('id', churchId)
    .maybeSingle()
  if (!church?.region_id) return null
  return getRegionById(church.region_id as string)
}

/**
 * Returns the region for the user's church, or null if the user has no
 * church set or the church has no region.
 */
export async function getUserRegion(userId: string): Promise<Region | null> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', userId)
    .maybeSingle()
  if (!profile?.church_id) return null
  return getRegionForChurch(profile.church_id as string)
}

/**
 * Returns counts of churches and members in each region. Used in the admin
 * regions list. Uses the admin client to bypass RLS for accurate counts.
 */
export async function getRegionStats(): Promise<
  { regionId: string; churchCount: number; memberCount: number }[]
> {
  const admin = createAdminClient()

  const { data: churchRows } = await admin
    .from('churches')
    .select('id, region_id')
    .not('region_id', 'is', null)

  const churchToRegion = new Map<string, string>()
  const churchCountByRegion: Record<string, number> = {}
  for (const row of (churchRows ?? []) as { id: string; region_id: string }[]) {
    churchToRegion.set(row.id, row.region_id)
    churchCountByRegion[row.region_id] =
      (churchCountByRegion[row.region_id] ?? 0) + 1
  }

  const { data: profileRows } = await admin
    .from('profiles')
    .select('church_id')
    .not('church_id', 'is', null)

  const memberCountByRegion: Record<string, number> = {}
  for (const row of (profileRows ?? []) as { church_id: string }[]) {
    const rid = churchToRegion.get(row.church_id)
    if (!rid) continue
    memberCountByRegion[rid] = (memberCountByRegion[rid] ?? 0) + 1
  }

  const regionIds = new Set([
    ...Object.keys(churchCountByRegion),
    ...Object.keys(memberCountByRegion),
  ])

  return Array.from(regionIds).map(regionId => ({
    regionId,
    churchCount: churchCountByRegion[regionId] ?? 0,
    memberCount: memberCountByRegion[regionId] ?? 0,
  }))
}

/**
 * Returns forum IDs that are scoped to the given region.
 */
export async function getForumIdsForRegion(
  regionId: string,
): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('forum_regions')
    .select('forum_id')
    .eq('region_id', regionId)
  return ((data ?? []) as { forum_id: string }[]).map(r => r.forum_id)
}

/**
 * Returns region IDs that scope a given forum. Empty = forum has no region
 * restriction.
 */
export async function getRegionIdsForForum(
  forumId: string,
): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('forum_regions')
    .select('region_id')
    .eq('forum_id', forumId)
  return ((data ?? []) as { region_id: string }[]).map(r => r.region_id)
}
