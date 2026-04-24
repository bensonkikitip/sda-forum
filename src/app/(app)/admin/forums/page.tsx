import { requireModerator } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin-nav'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Globe, Lock, Plus, Settings } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminForumsPage() {
  await requireModerator()
  const admin = createAdminClient()

  const [forumsRes, forumGroupsRes, groupsRes] = await Promise.all([
    admin.from('forums').select('id, name, slug, description, icon, color').order('created_at'),
    admin.from('forum_groups').select('forum_id, group_id'),
    admin.from('groups').select('id, name').order('name'),
  ])

  const forums = forumsRes.data ?? []
  const groups = groupsRes.data ?? []

  // Build forum → group name list
  const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]))
  const forumGroupNames: Record<string, string[]> = {}
  for (const row of forumGroupsRes.data ?? []) {
    if (!forumGroupNames[row.forum_id]) forumGroupNames[row.forum_id] = []
    forumGroupNames[row.forum_id].push(groupMap[row.group_id] ?? '')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <AdminNav />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Forums</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {forums.length} {forums.length === 1 ? 'forum' : 'forums'}
          </p>
        </div>
        <Link href="/admin/forums/new" className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}>
          <Plus className="h-4 w-4" /> New forum
        </Link>
      </div>

      {forums.length === 0 ? (
        <p className="text-sm text-muted-foreground">No forums yet.</p>
      ) : (
        <div className="space-y-2">
          {forums.map(f => {
            const groupNames = forumGroupNames[f.id] ?? []
            const restricted = groupNames.length > 0
            return (
              <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border">
                <span className="text-2xl mt-0.5">{f.icon ?? '💬'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{f.description ?? 'No description'}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {restricted ? (
                      <>
                        <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                        {groupNames.map(n => (
                          <Badge key={n} variant="outline" className="text-[10px] py-0">{n}</Badge>
                        ))}
                      </>
                    ) : (
                      <>
                        <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">All members</span>
                      </>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="font-mono text-xs shrink-0 mt-0.5">{f.slug}</Badge>
                <Link
                  href={`/admin/forums/${f.id}`}
                  className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Manage forum"
                >
                  <Settings className="h-4 w-4" />
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
