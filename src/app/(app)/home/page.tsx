import Link from 'next/link'
import { requireUser, getUserRole } from '@/lib/auth'
import { getForums } from '@/lib/queries/forums'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, ChevronRight, Megaphone, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await requireUser()
  const supabase = await createClient()

  const [role, forums, announcementResult] = await Promise.all([
    getUserRole(user.id),
    getForums(),
    supabase
      .from('announcements')
      .select('id, title, body_md, created_at')
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const latestAnnouncement = announcementResult.data?.[0]
  const isModOrAdmin = role === 'admin' || role === 'moderator'

  // Fetch the most recent non-removed post title for every visible forum
  // in one query, then build a map: forum_id → post title
  const latestPostByForum: Record<string, string> = {}
  if (forums.length > 0) {
    const forumIds = forums.map(f => f.id)
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('forum_id, title')
      .in('forum_id', forumIds)
      .eq('is_removed', false)
      .order('created_at', { ascending: false })

    // Keep only the first (newest) post seen for each forum
    for (const post of recentPosts ?? []) {
      if (!latestPostByForum[post.forum_id]) {
        latestPostByForum[post.forum_id] = post.title
      }
    }
  }

  return (
    <div className="min-h-screen">

      {/* ── Hero banner ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden py-12 px-4"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, oklch(0.22 0.10 258) 100%)',
        }}
      >
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full opacity-5 bg-white" />

        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-sm font-semibold tracking-widest text-white/60 uppercase mb-3">
            Welcome to
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            SDA Community
          </h1>
          <p className="text-white/70 text-base max-w-xl mx-auto leading-relaxed">
            Stay connected with messages and updates from your pastors and church leaders.
          </p>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Announcement banner */}
        {latestAnnouncement && (
          <Link href="/inbox" className="block group">
            <div className="flex gap-3 p-4 rounded-lg border-l-4 border-accent bg-accent/5 hover:bg-accent/10 transition-colors">
              <Megaphone className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-0.5">
                  Latest Announcement
                </p>
                <p className="font-semibold text-foreground">{latestAnnouncement.title}</p>
                {latestAnnouncement.body_md && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {latestAnnouncement.body_md}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 self-center group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        )}

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Groups</h2>
            <Badge variant="secondary" className="font-mono text-xs">{forums.length}</Badge>
          </div>
          {isModOrAdmin && (
            <Link
              href="/admin/forums"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
            >
              Manage groups
            </Link>
          )}
        </div>

        {/* Forum cards */}
        {forums.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-muted/30">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-semibold text-muted-foreground">No groups yet</p>
            {isModOrAdmin && (
              <p className="text-sm mt-2 text-muted-foreground">
                <Link href="/admin/forums/new" className="underline hover:no-underline">
                  Create the first group
                </Link>
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {forums.map(forum => {
              const latestTitle = latestPostByForum[forum.id]
              return (
                <Link key={forum.id} href={`/forums/${forum.id}`} className="group block">
                  <div className="h-full flex flex-col p-5 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all duration-200">

                    {/* Icon + chevron */}
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{
                          backgroundColor: forum.color ? `${forum.color}18` : 'oklch(0.96 0.005 258)',
                        }}
                      >
                        {forum.icon ?? '💬'}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
                    </div>

                    {/* Name + description */}
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                      {forum.name}
                    </p>
                    {forum.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {forum.description}
                      </p>
                    )}

                    {/* Latest post preview */}
                    <div className="mt-auto pt-3 border-t border-border/50">
                      {latestTitle ? (
                        <div className="flex items-start gap-1.5">
                          <MessageSquare
                            className="h-3 w-3 shrink-0 mt-0.5"
                            style={{ color: forum.color ?? 'var(--primary)' }}
                          />
                          <span className="text-xs text-muted-foreground line-clamp-1 leading-snug">
                            {latestTitle}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: forum.color ?? 'var(--primary)' }}
                          />
                          <span className="text-xs text-muted-foreground">No posts yet</span>
                        </div>
                      )}
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
