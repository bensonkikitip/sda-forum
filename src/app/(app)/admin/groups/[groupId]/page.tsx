import { notFound } from 'next/navigation'
import { requireModerator } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin-nav'
import { ChurchMembershipManager } from './_components/church-membership-manager'
import { ForumAccessManager } from './_components/forum-access-manager'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  await requireModerator()
  const admin = createAdminClient()

  const [groupResult, memberChurchesResult, allForumsResult, groupForumsResult] = await Promise.all([
    admin.from('groups').select('id, name, description').eq('id', groupId).maybeSingle(),
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
        <h1 className="text-2xl font-bold">{group.name}</h1>
        {group.description && <p className="text-muted-foreground text-sm mt-1">{group.description}</p>}
      </div>

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
    </div>
  )
}
