import { requireModerator } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin-nav'
import { CreateChurchForm } from './_components/create-church-form'
import { ChurchSearchBar } from './_components/church-search-bar'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ChevronRight, Church, Settings } from 'lucide-react'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function AdminChurchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  await requireModerator()
  const { q } = await searchParams
  const admin = createAdminClient()

  // Fetch churches (filtered or all)
  let churchQuery = admin
    .from('churches')
    .select('id, name, country, region_id, regions(name)')
    .order('name')

  if (q?.trim()) {
    churchQuery = churchQuery.ilike('name', `%${q.trim()}%`)
  }

  const [{ data: churches }, { data: profileRows }] = await Promise.all([
    churchQuery,
    admin.from('profiles').select('church_id').not('church_id', 'is', null),
  ])

  // Count members per church
  const memberCount: Record<string, number> = {}
  for (const p of (profileRows ?? []) as { church_id: string }[]) {
    memberCount[p.church_id] = (memberCount[p.church_id] ?? 0) + 1
  }

  const rows = (churches ?? []) as {
    id: string
    name: string
    country: string | null
    region_id: string | null
    regions: { name: string } | { name: string }[] | null
  }[]

  function regionName(r: typeof rows[number]) {
    if (!r.regions) return null
    return Array.isArray(r.regions) ? r.regions[0]?.name : r.regions.name
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <AdminNav />

      <div>
        <h1 className="text-2xl font-bold">Churches</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Add, rename, or remove churches. Assign them to regions via the Regions panel.
        </p>
      </div>

      <CreateChurchForm />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {q?.trim()
              ? `Results for "${q.trim()}" (${rows.length})`
              : `All churches (${rows.length})`}
          </h2>
        </div>

        {/* Search bar needs Suspense because it reads useSearchParams */}
        <Suspense>
          <ChurchSearchBar />
        </Suspense>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {q?.trim() ? 'No churches match that search.' : 'No churches yet. Add one above.'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {rows.map(c => {
              const rName = regionName(c)
              const members = memberCount[c.id] ?? 0
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:border-foreground/20 hover:bg-muted/30 transition-all group"
                >
                  <Church className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{c.name}</p>
                    {c.country && (
                      <p className="text-xs text-muted-foreground">{c.country}</p>
                    )}
                  </div>
                  {rName ? (
                    <Badge variant="outline" className="shrink-0 text-xs">{rName}</Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0 text-xs text-muted-foreground">No region</Badge>
                  )}
                  <Badge variant="secondary" className="shrink-0">
                    {members} {members === 1 ? 'member' : 'members'}
                  </Badge>
                  <Link
                    href={`/admin/churches/${c.id}`}
                    className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Manage church"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
