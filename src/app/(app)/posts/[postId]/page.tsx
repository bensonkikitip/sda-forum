import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireUser, canModerateForumId } from '@/lib/auth'
import { getPostById, getCommentsForPost } from '@/lib/queries/posts'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CommentComposer } from '@/components/comment-composer'
import { ReportButton } from '@/components/report-button'
import { BlurredContent } from '@/components/blurred-content'
import { ModActions } from '@/components/mod-actions'
import { EventCard } from '@/components/event-card'
import { ChevronLeft, Pin, Lock, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export const dynamic = 'force-dynamic'

export default async function PostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  const me = await requireUser()

  // Fetch post first — we need forum_id before we can check mod access
  const [post, comments] = await Promise.all([
    getPostById(postId),
    getCommentsForPost(postId),
  ])

  if (!post || post.is_removed) notFound()

  // Check whether this user can moderate THIS specific forum
  const isMod = await canModerateForumId(me.id, post.forum_id)
  // Still keep role for other checks (e.g. showing/hiding report button)
  const role = isMod ? 'mod' : 'user'
  const author = Array.isArray(post.author) ? post.author[0] : post.author

  // Fetch open reports for this post and its comments (admin client bypasses RLS)
  const adminClient = createAdminClient()
  const commentIds = comments.map((c: { id: string }) => c.id)
  const allTargetIds = [postId, ...commentIds]
  const { data: openReports } = await adminClient
    .from('reports')
    .select('target_id, reporter_id')
    .in('target_id', allTargetIds)
    .eq('status', 'open')

  const reportedIds = new Set((openReports ?? []).map(r => r.target_id))
  const myReportedIds = new Set((openReports ?? []).filter(r => r.reporter_id === me.id).map(r => r.target_id))

  // Get signed URLs for any attached images
  const supabase = await createClient()
  const imageUrls: string[] = []
  const images = (post.post_images ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position)
  for (const img of images) {
    const { data } = await supabase.storage
      .from('post-images')
      .createSignedUrl(img.storage_path, 60 * 60)
    if (data?.signedUrl) imageUrls.push(data.signedUrl)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link
        href={`/forums/${post.forum_id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to forum
      </Link>

      {/* Post card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {post.is_pinned && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Pin className="h-3 w-3" /> Pinned
              </Badge>
            )}
            {post.is_locked && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Lock className="h-3 w-3" /> Locked
              </Badge>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold leading-snug">{post.title}</h1>

          {/* Topic badges */}
          {post.post_topics && (post.post_topics as unknown[]).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(post.post_topics as unknown as { topic_id: string; topics: { id: string; name: string; icon: string | null; color: string | null } | null }[]).map(pt => {
                const t = pt.topics
                if (!t) return null
                return (
                  <span
                    key={pt.topic_id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: t.color ? `${t.color}20` : 'var(--muted)',
                      color: t.color ?? undefined,
                      border: `1px solid ${t.color ?? 'transparent'}`,
                    }}
                  >
                    {t.icon && <span>{t.icon}</span>}
                    {t.name}
                  </span>
                )
              })}
            </div>
          )}

          {/* Author + date */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Link href={`/profile/${author?.id}`}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {author?.display_name?.slice(0, 2).toUpperCase() ?? '??'}
                  </AvatarFallback>
                  <AvatarImage src={author?.avatar_url ?? undefined} />
                </Avatar>
              </Link>
              <div className="text-sm">
                <Link href={`/profile/${author?.id}`} className="font-medium hover:underline">
                  {author?.display_name ?? 'Unknown'}
                </Link>
                <span className="text-muted-foreground ml-2">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            {!isMod && (
              <ReportButton
                targetType="post"
                targetId={postId}
                alreadyReported={myReportedIds.has(postId)}
              />
            )}
          </div>

          {/* Mod actions */}
          {isMod && (
            <ModActions
              postId={postId}
              forumId={post.forum_id}
              isPinned={post.is_pinned}
              isLocked={post.is_locked}
              isRemoved={post.is_removed}
            />
          )}

          {/* Event card — only rendered when event_starts_at is set */}
          {post.event_starts_at && (
            <EventCard
              title={post.title}
              startsAt={post.event_starts_at}
              endsAt={post.event_ends_at}
              location={post.event_location}
              locationUrl={post.event_location_url}
            />
          )}

          {/* Body */}
          <BlurredContent isBlurred={reportedIds.has(postId) && !isMod} isMod={isMod && reportedIds.has(postId)}>
            {post.body_md && (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body_md}</ReactMarkdown>
              </div>
            )}

            {/* Images */}
            {imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {imageUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Image ${i + 1}`}
                      className="h-48 w-auto max-w-full rounded-md border object-cover hover:opacity-90 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            )}
          </BlurredContent>
        </CardContent>
      </Card>

      {/* Comments section */}
      <div className="space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {post.comment_count === 1 ? '1 comment' : `${post.comment_count} comments`}
        </h2>

        {/* Comment list */}
        {comments.length > 0 && (
          <div className="space-y-3">
            {comments.map((comment: {
              id: string
              body_md: string
              created_at: string
              author: { id: string; display_name: string; avatar_url: string | null } | { id: string; display_name: string; avatar_url: string | null }[]
            }) => {
              const cAuthor = Array.isArray(comment.author) ? comment.author[0] : comment.author
              const isCommentReported = reportedIds.has(comment.id)
              return (
                <div key={comment.id} className="flex gap-3">
                  <Link href={`/profile/${cAuthor?.id}`}>
                    <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                      <AvatarImage src={cAuthor?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {cAuthor?.display_name?.slice(0, 2).toUpperCase() ?? '??'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="rounded-lg border bg-muted/30 px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Link href={`/profile/${cAuthor?.id}`} className="font-medium hover:underline">
                            {cAuthor?.display_name ?? 'Unknown'}
                          </Link>
                          <span className="text-muted-foreground text-xs">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {!isMod && (
                          <ReportButton
                            targetType="comment"
                            targetId={comment.id}
                            alreadyReported={myReportedIds.has(comment.id)}
                          />
                        )}
                      </div>
                      <BlurredContent isBlurred={isCommentReported && !isMod} isMod={isMod && isCommentReported}>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.body_md}</ReactMarkdown>
                        </div>
                      </BlurredContent>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Composer */}
        <div className="pt-2">
          <CommentComposer postId={postId} isLocked={post.is_locked} />
        </div>
      </div>
    </div>
  )
}
