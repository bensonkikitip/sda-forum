import { notFound } from 'next/navigation'
import { requireModerator } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin-nav'
import { ForumGroupManager } from './_components/forum-group-manager'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ForumDetailPage({ params }: { params: Promise<{ forumId: string }> }) {
  const { forumId } = await params
  await requireModerator()
  const admin = createAdminClient()

  const [forumResult, allGroupsResult, forumGroupsResult] = await Promise.all([
    admin.from('forums').select('id, name, description, icon, color, slug').eq('id', forumId).maybeSingle(),
    admin.from('groups').select('id, name, description').order('name'),
    admin.from('forum_groups').select('group_id').eq('forum_id', forumId),
  ])

  if (!forumResult.data) notFound()

  const forum = forumResult.data
  const allGroups = allGroupsResult.data ?? []
  const enabledGroupIds = (forumGroupsResult.data ?? []).map(r => r.group_id)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <AdminNav />
      <div>
        <Link href="/admin/forums" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> All forums
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{forum.icon ?? '💬'}</span>
          <div>
            <h1 className="text-2xl font-bold">{forum.name}</h1>
            {forum.description && <p className="text-muted-foreground text-sm mt-0.5">{forum.description}</p>}
          </div>
        </div>
      </div>

      <ForumGroupManager
        forumId={forumId}
        allGroups={allGroups}
        enabledGroupIds={enabledGroupIds}
      />
    </div>
  )
}
