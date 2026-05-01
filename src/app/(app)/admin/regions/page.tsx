import { requireModerator } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin-nav'
import { CreateRegionForm } from './_components/create-region-form'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ChevronRight, Map as MapIcon, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminRegionsPage() {
  await requireModerator()
  const admin = createAdminClient()

  const [{ data: regions }, { data: churchRows }, { data: profileRows }] = await Promise.all([
    admin
      .from('regions')
      .select('id, name, description, is_archived, created_at')
      .order('name'),
    admin
      .from('churches')
      .select('id, region_id')
      .not('region_id', 'is', null),
    admin
      .from('profiles')
      .select('church_id')
      .not('church_id', 'is', null),
  ])

  // Tally counts
  const churchCount: Record<string, number> = {}
  const churchToRegion = new Map<string, string>()
  for (const c of (churchRows ?? []) as { id: string; region_id: string }[]) {
    churchToRegion.set(c.id, c.region_id)
    churchCount[c.region_id] = (churchCount[c.region_id] ?? 0) + 1
  }

  const memberCount: Record<string, number> = {}
  for (const p of (profileRows ?? []) as { church_id: string }[]) {
    const rid = churchToRegion.get(p.church_id)
    if (!rid) continue
    memberCount[rid] = (memberCount[rid] ?? 0) + 1
  }

  const allRegions = regions ?? []
  const active   = allRegions.filter(r => !r.is_archived)
  const archived = allRegions.filter(r =>  r.is_archived)

  function RegionRow({ r, muted = false }: { r: typeof allRegions[number]; muted?: boolean }) {
    return (
      <Link key={r.id} href={`/admin/regions/${r.id}`}>
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-lg border hover:border-foreground/20 hover:bg-muted/30 transition-all group',
          muted && 'opacity-60 bg-muted/20'
        )}>
          <MapIcon className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium group-hover:text-primary transition-colors">{r.name}</p>
            {r.description && (
              <p className="text-xs text-muted-foreground truncate">{r.description}</p>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0">
            {churchCount[r.id] ?? 0} {churchCount[r.id] === 1 ? 'church' : 'churches'}
          </Badge>
          <Badge variant="outline" className="shrink-0">
            {memberCount[r.id] ?? 0} {memberCount[r.id] === 1 ? 'member' : 'members'}
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </Link>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <AdminNav />

      <div>
        <h1 className="text-2xl font-bold">Regions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          A region groups churches by geography or conference. Members in a region auto-subscribe to its forums.
        </p>
      </div>

      <CreateRegionForm />

      {/* Active regions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Existing regions ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active regions yet. Create one above to start grouping churches.
          </p>
        ) : (
          <div className="space-y-2">
            {active.map(r => <RegionRow key={r.id} r={r} />)}
          </div>
        )}
      </div>

      {/* Archived regions */}
      {archived.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Archive className="h-4 w-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Archived regions ({archived.length})
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Hidden from active lists. Manage a region to unarchive it.
          </p>
          <div className="space-y-2">
            {archived.map(r => <RegionRow key={r.id} r={r} muted />)}
          </div>
        </div>
      )}
    </div>
  )
}
