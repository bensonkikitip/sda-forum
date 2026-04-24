import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser, getUserRole } from '@/lib/auth'
import { getForumById } from '@/lib/queries/forums'
import { getPostsForForum } from '@/lib/queries/posts'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare, Pin, Lock, Plus, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { SubscribeButton } from '@/components/subscribe-button'

export const dynamic = 'force-dynamic'

export default async function ForumPage({ params }: { params: Promise<{ forumId: string }> }) {
  const { forumId } = await params
  const user = await requireUser()
  const supabase = await createClient()

  const [forum, posts, role, subResult] = await Promise.all([
    getForumById(forumId),
    getPostsForForum(forumId, 'newest'),
    getUserRole(user.id),
    supabase
      .from('forum_subscriptions')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('forum_id', forumId)
      .maybeSingle(),
  ])

  const isSubscribed = !!subResult.data

  if (!forum) notFound()

  // Use forum color for the banner, fall back to the primary navy
  const bannerColor = forum.color ?? '#003E7E'

  return (
    <div className="min-h-screen">

      {/* ── Forum banner ─────────────────────────────────────────── */}
      <div
        className="relative px-4 py-8"
        style={{
          background: `linear-gradient(135deg, ${bannerColor} 0%, ${bannerColor}cc 100%)`,
        }}
      >
        <div className="max-w-3xl mx-auto">
          <Link
            href="/home"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white mb-5 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> All forums
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 bg-white/15 backdrop-blur-sm">
                {forum.icon ?? '💬'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white leading-tight">{forum.name}</h1>
                {forum.description && (
                  <p className="text-sm text-white/70 mt-0.5">{forum.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <SubscribeButton forumId={forumId} isSubscribed={isSubscribed} />
              {(role === 'admin' || role === 'moderator') && (
                <Link
                  href={`/forums/${forumId}/new-post`}
                  className={cn(buttonVariants({ size: 'sm' }), 'gap-1 bg-white text-foreground hover:bg-white/90')}
                >
                  <Plus className="h-4 w-4" /> New post
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Posts list ───────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No posts yet</p>
              <p className="text-sm mt-1">Check back soon for updates from your church leaders.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {posts.map(post => {
              const author = Array.isArray(post.author) ? post.author[0] : post.author
              return (
                <Link key={post.id} href={`/posts/${post.id}`}>
                  <div className="flex gap-4 p-4 rounded-xl border bg-card hover:shadow-sm hover:border-primary/30 transition-all group">
                    <Avatar className="h-10 w-10 shrink-0 mt-0.5">
                      <AvatarImage src={author?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {author?.display_name?.slice(0, 2).toUpperCase() ?? '??'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {post.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                        {post.is_locked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                        <p className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                          {post.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">{author?.display_name ?? 'Unknown'}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {post.comment_count}
                        </span>
                        {post.is_pinned && <Badge variant="secondary" className="text-[10px] py-0">Pinned</Badge>}
                        {post.is_locked && <Badge variant="outline" className="text-[10px] py-0">Locked</Badge>}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
