import { requireModerator } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin-nav'
import { CreateGroupForm } from './_components/create-group-form'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ChevronRight, Layers } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function AdminGroupsPage() {
  await requireModerator()
  const admin = createAdminClient()

  // Fetch groups with church count
  const { data: groups } = await admin
    .from('groups')
    .select('id, name, description, created_at')
    .order('name')

  // Fetch church counts per group
  const groupIds = (groups ?? []).map(g => g.id)
  let churchCountMap: Record<string, number> = {}
  if (groupIds.length > 0) {
    const { data: counts } = await admin
      .from('church_groups')
      .select('group_id')
      .in('group_id', groupIds)
    for (const row of counts ?? []) {
      churchCountMap[row.group_id] = (churchCountMap[row.group_id] ?? 0) + 1
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-bold">Groups</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Groups bundle churches together. Forums can be restricted to specific groups.
        </p>
      </div>

      <CreateGroupForm />

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Existing groups ({(groups ?? []).length})
        </h2>
        {(groups ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No groups yet. Create one above.</p>
        ) : (
          <div className="space-y-2">
            {(groups ?? []).map(g => (
              <Link key={g.id} href={`/admin/groups/${g.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:border-foreground/20 hover:bg-muted/30 transition-all group">
                  <Layers className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium group-hover:text-primary transition-colors">{g.name}</p>
                    {g.description && (
                      <p className="text-xs text-muted-foreground truncate">{g.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {churchCountMap[g.id] ?? 0} {churchCountMap[g.id] === 1 ? 'church' : 'churches'}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
