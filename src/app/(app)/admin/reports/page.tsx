import { requireModerator } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { ReportQueue } from './_components/report-queue'
import { AdminNav } from '@/components/admin-nav'

export const dynamic = 'force-dynamic'

type ReportRow = {
  id: string
  target_type: 'post' | 'comment'
  target_id: string
  reason: string | null
  created_at: string
  reporter: { display_name: string } | null
  content: string | null
  content_author: string | null
}

export default async function AdminReportsPage() {
  await requireModerator()
  const adminClient = createAdminClient()

  // Fetch open reports (using admin client so we can join reporter profiles)
  const { data: reports } = await adminClient
    .from('reports')
    .select('id, target_type, target_id, reason, created_at, reporter_id')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!reports || reports.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <AdminNav />
        <div>
          <h1 className="text-2xl font-bold">Report Queue</h1>
          <p className="text-muted-foreground mt-2">No open reports.</p>
        </div>
      </div>
    )
  }

  // Batch-fetch reporter profiles
  const reporterIds = [...new Set(reports.map(r => r.reporter_id))]
  const { data: reporterProfiles } = await adminClient
    .from('profiles')
    .select('id, display_name')
    .in('id', reporterIds)
  const reporterMap = Object.fromEntries((reporterProfiles ?? []).map(p => [p.id, p.display_name]))

  // Separate posts vs comments
  const postIds = reports.filter(r => r.target_type === 'post').map(r => r.target_id)
  const commentIds = reports.filter(r => r.target_type === 'comment').map(r => r.target_id)

  const [postsResult, commentsResult] = await Promise.all([
    postIds.length > 0
      ? adminClient.from('posts').select('id, title, body_md, author_id').in('id', postIds)
      : Promise.resolve({ data: [] }),
    commentIds.length > 0
      ? adminClient.from('comments').select('id, body_md, author_id').in('id', commentIds)
      : Promise.resolve({ data: [] }),
  ])

  type PostRow = { id: string; title: string; body_md: string; author_id: string }
  type CommentRow = { id: string; body_md: string; author_id: string }
  const postMap = Object.fromEntries((postsResult.data ?? []).map((p: PostRow) => [p.id, p]))
  const commentMap = Object.fromEntries((commentsResult.data ?? []).map((c: CommentRow) => [c.id, c]))

  // Batch-fetch content author profiles separately (avoids FK join issue)
  const contentAuthorIds = [
    ...(postsResult.data ?? []).map((p: PostRow) => p.author_id),
    ...(commentsResult.data ?? []).map((c: CommentRow) => c.author_id),
  ]
  const uniqueContentAuthorIds = [...new Set(contentAuthorIds)]
  const { data: contentAuthorProfiles } = uniqueContentAuthorIds.length > 0
    ? await adminClient.from('profiles').select('id, display_name').in('id', uniqueContentAuthorIds)
    : { data: [] }
  const contentAuthorMap = Object.fromEntries((contentAuthorProfiles ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name]))

  const enrichedReports: ReportRow[] = reports.map(r => {
    const isPost = r.target_type === 'post'
    const item = isPost ? postMap[r.target_id] : commentMap[r.target_id]
    return {
      id: r.id,
      target_type: r.target_type as 'post' | 'comment',
      target_id: r.target_id,
      reason: r.reason,
      created_at: r.created_at,
      reporter: { display_name: reporterMap[r.reporter_id] ?? 'Unknown' },
      content: isPost ? ((item as PostRow)?.title ?? null) : ((item as CommentRow)?.body_md ?? null),
      content_author: item?.author_id ? (contentAuthorMap[item.author_id] ?? null) : null,
    }
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-bold">Report Queue</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {enrichedReports.length} open {enrichedReports.length === 1 ? 'report' : 'reports'}
        </p>
      </div>
      <ReportQueue reports={enrichedReports} />
    </div>
  )
}
