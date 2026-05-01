import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser, canModerateForumId } from '@/lib/auth'
import { getForumById } from '@/lib/queries/forums'
import { getGroupedPostsForForum } from '@/lib/queries/posts'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare, Pin, Lock, Plus, ChevronLeft, MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { SubscribeButton } from '@/components/subscribe-button'
import { DateBadge } from '@/components/date-badge'

export const dynamic = 'force-dynamic'

export default async function ForumPage({ params }: { params: Promise<{ forumId: string }> }) {
  const { forumId } = await params
  const user = await requireUser()
  const supabase = await createClient()

  const [forum, { active, past }, canMod, subResult] = await Promise.all([
    getForumById(forumId),
    getGroupedPostsForForum(forumId),
    canModerateForumId(user.id, forumId),
    supabase
      .from('forum_subscriptions')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('forum_id', forumId)
      .maybeSingle(),
  ])

  const isSubscribed = !!subResult.data

  if (!forum) notFound()

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
            <ChevronLeft className="h-4 w-4" /> All groups
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 bg-white/15 backdrop-blur-sm">
                {forum.icon ?? '💬'}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-white leading-tight break-words">{forum.name}</h1>
                {forum.description && (
                  <p className="text-sm text-white/70 mt-0.5 break-words">{forum.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <SubscribeButton forumId={forumId} isSubscribed={isSubscribed} />
              {canMod && (
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

      {/* ── Posts ────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">

        {/* Active posts */}
        {active.length === 0 && past.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No posts yet</p>
              <p className="text-sm mt-1">Check back soon for updates from your church leaders.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {active.length > 0 && (
              <PostSection posts={active} forumColor={forum.color} />
            )}

            {/* Past events */}
            {past.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Past Events
                  </h2>
                </div>
                <PostSection posts={past} forumColor={forum.color} muted />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PostSection — shared renderer for both active and past buckets
// ---------------------------------------------------------------------------

type TopicEntry = {
  topic_id: string
  topics: { id: string; name: string; icon: string | null; color: string | null } | null
}

type Post = {
  id: string
  title: string
  is_pinned: boolean
  is_locked: boolean
  comment_count: number
  created_at: string
  event_starts_at: string | null
  event_location: string | null
  post_topics: TopicEntry[]
  author: { id: string; display_name: string; avatar_url: string | null } | null
}

function PostSection({
  posts,
  forumColor,
  muted = false,
}: {
  posts: Post[]
  forumColor?: string | null
  muted?: boolean
}) {
  return (
    <div className="space-y-3">
      {posts.map(post => {
        const isEvent = !!post.event_starts_at

        // ── Event card ──────────────────────────────────────────────────────
        if (isEvent && post.event_starts_at) {
          const eventDate = new Date(post.event_starts_at)
          const dayName = format(eventDate, 'EEEE')
          const timeStr = format(eventDate, 'h:mm a')

          return (
            <Link key={post.id} href={`/posts/${post.id}`}>
              <div
                className={cn(
                  'flex gap-4 p-5 rounded-xl border transition-all duration-200 group',
                  muted
                    ? 'bg-muted/20 hover:bg-muted/40 border-border/40 opacity-70 hover:opacity-90'
                    : 'bg-card hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20'
                )}
              >
                {/* Date badge */}
                <DateBadge
                  date={eventDate}
                  color={muted ? undefined : (forumColor ?? undefined)}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    {post.is_pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
                    {post.is_locked && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                    <p className={cn(
                      'font-bold text-base leading-snug transition-colors',
                      muted ? 'text-muted-foreground' : 'group-hover:text-primary'
                    )}>
                      {post.title}
                    </p>
                  </div>

                  {/* Event time + location */}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {dayName} · {timeStr}
                    </span>
                    {post.event_location && (
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-1">{post.event_location}</span>
                      </span>
                    )}
                  </div>

                  {/* Topic badges */}
                  {post.post_topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {post.post_topics.map(pt => {
                        const t = pt.topics
                        if (!t) return null
                        return (
                          <span
                            key={pt.topic_id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: t.color ? `${t.color}18` : undefined,
                              color: t.color ?? undefined,
                              border: `1px solid ${t.color ? `${t.color}50` : 'transparent'}`,
                            }}
                          >
                            {t.icon && <span>{t.icon}</span>}
                            {t.name}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Footer: author + comments */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{post.author?.display_name ?? 'Unknown'}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {post.comment_count}
                    </span>
                    {post.is_pinned && (
                      <Badge variant="secondary" className="text-[10px] py-0 font-medium">Pinned</Badge>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        }

        // ── Announcement card ────────────────────────────────────────────────
        return (
          <Link key={post.id} href={`/posts/${post.id}`}>
            <div
              className={cn(
                'flex gap-4 p-5 rounded-xl border-l-4 border border-l-transparent transition-all duration-200 group',
                muted
                  ? 'bg-muted/20 hover:bg-muted/40 border-border/40 opacity-70 hover:opacity-90'
                  : 'bg-card hover:shadow-md hover:-translate-y-0.5'
              )}
              style={!muted ? {
                borderLeftColor: forumColor ?? 'var(--primary)',
              } : undefined}
            >
              <Avatar className={cn('h-9 w-9 shrink-0 mt-0.5', muted && 'opacity-60')}>
                <AvatarImage src={post.author?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs font-semibold">
                  {post.author?.display_name?.slice(0, 2).toUpperCase() ?? '??'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  {post.is_pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
                  {post.is_locked && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                  <p className={cn(
                    'font-bold text-base leading-snug transition-colors',
                    muted ? 'text-muted-foreground' : 'group-hover:text-primary'
                  )}>
                    {post.title}
                  </p>
                </div>

                {/* Topic badges */}
                {post.post_topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {post.post_topics.map(pt => {
                      const t = pt.topics
                      if (!t) return null
                      return (
                        <span
                          key={pt.topic_id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            backgroundColor: t.color ? `${t.color}18` : undefined,
                            color: t.color ?? undefined,
                            border: `1px solid ${t.color ? `${t.color}50` : 'transparent'}`,
                          }}
                        >
                          {t.icon && <span>{t.icon}</span>}
                          {t.name}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Footer: author + time + comments */}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">{post.author?.display_name ?? 'Unknown'}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {post.comment_count}
                  </span>
                  {post.is_pinned && (
                    <Badge variant="secondary" className="text-[10px] py-0 font-medium">Pinned</Badge>
                  )}
                  {post.is_locked && (
                    <Badge variant="outline" className="text-[10px] py-0">Locked</Badge>
                  )}
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
