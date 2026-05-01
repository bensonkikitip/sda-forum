import { notFound } from 'next/navigation'
import { requireModerator } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin-nav'
import { ChurchMembershipManager } from './_components/church-membership-manager'
import { ForumAccessManager } from './_components/forum-access-manager'
import { GroupArchiveControl } from './_components/group-archive-control'
import { ChevronLeft, Archive } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  await requireModerator()
  const admin = createAdminClient()

  const [groupResult, memberChurchesResult, allForumsResult, groupForumsResult] = await Promise.all([
    admin.from('groups').select('id, name, description, is_archived').eq('id', groupId).maybeSingle(),
    // Churches currently in this group
    admin
      .from('church_groups')
      .select('church_id, churches(id, name, region)')
      .eq('group_id', groupId),
    // All forums
    admin.from('forums').select('id, name, icon').order('name'),
    // Forums this group can currently see
    admin.from('forum_groups').select('forum_id').eq('group_id', groupId),
  ])

  if (!groupResult.data) notFound()

  const group = groupResult.data
  const memberChurches = (memberChurchesResult.data ?? []).map(row => {
    const church = Array.isArray(row.churches) ? row.churches[0] : row.churches
    return { id: church?.id ?? '', name: church?.name ?? '', region: church?.region ?? null }
  })
  const allForums = allForumsResult.data ?? []
  const groupForumIds = new Set((groupForumsResult.data ?? []).map(r => r.forum_id))

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <AdminNav />
      <div>
        <Link href="/admin/groups" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> All audiences
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          {group.is_archived && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <Archive className="h-3 w-3" /> Archived
            </span>
          )}
        </div>
        {group.description && <p className="text-muted-foreground text-sm mt-1">{group.description}</p>}
      </div>

      {group.is_archived && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <Archive className="h-4 w-4 shrink-0 mt-0.5" />
          <p>This audience is archived and hidden from active admin lists. Existing church memberships and forum access rules remain intact.</p>
        </div>
      )}

      {/* Church membership */}
      <ChurchMembershipManager
        groupId={groupId}
        memberChurches={memberChurches}
      />

      {/* Forum access */}
      <ForumAccessManager
        groupId={groupId}
        allForums={allForums}
        enabledForumIds={[...groupForumIds]}
      />

      <GroupArchiveControl groupId={groupId} isArchived={group.is_archived ?? false} />
    </div>
  )
}
