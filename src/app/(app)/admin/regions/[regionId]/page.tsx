import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Archive } from 'lucide-react'
import { requireModerator } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin-nav'
import { RegionChurchesManager } from './_components/region-churches-manager'
import { RegionForumsManager } from './_components/region-forums-manager'
import { RegionArchiveControl } from './_components/region-archive-control'

export const dynamic = 'force-dynamic'

export default async function RegionDetailPage({
  params,
}: {
  params: Promise<{ regionId: string }>
}) {
  const { regionId } = await params
  await requireModerator()
  const admin = createAdminClient()

  const [regionResult, memberChurchesResult, allForumsResult, regionForumsResult] = await Promise.all([
    admin.from('regions').select('id, name, description, is_archived').eq('id', regionId).maybeSingle(),
    admin
      .from('churches')
      .select('id, name, region')
      .eq('region_id', regionId)
      .order('name'),
    admin.from('forums').select('id, name, icon').order('name'),
    admin.from('forum_regions').select('forum_id').eq('region_id', regionId),
  ])

  if (!regionResult.data) notFound()

  const region = regionResult.data
  const memberChurches = (memberChurchesResult.data ?? []) as {
    id: string
    name: string
    region: string | null
  }[]
  const allForums = (allForumsResult.data ?? []) as {
    id: string
    name: string
    icon: string | null
  }[]
  const enabledForumIds = ((regionForumsResult.data ?? []) as { forum_id: string }[]).map(r => r.forum_id)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <AdminNav />
      <div>
        <Link
          href="/admin/regions"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> All regions
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{region.name}</h1>
          {region.is_archived && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <Archive className="h-3 w-3" /> Archived
            </span>
          )}
        </div>
        {region.description && (
          <p className="text-muted-foreground text-sm mt-1">{region.description}</p>
        )}
      </div>

      {region.is_archived && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <Archive className="h-4 w-4 shrink-0 mt-0.5" />
          <p>This region is archived and hidden from active admin lists. Existing church assignments and forum scoping remain intact.</p>
        </div>
      )}

      <RegionChurchesManager regionId={regionId} memberChurches={memberChurches} />

      <RegionForumsManager
        regionId={regionId}
        allForums={allForums}
        enabledForumIds={enabledForumIds}
      />

      <RegionArchiveControl regionId={regionId} isArchived={region.is_archived ?? false} />
    </div>
  )
}
