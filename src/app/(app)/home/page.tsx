import Link from 'next/link'
import { requireUser, getUserRole } from '@/lib/auth'
import { getForums } from '@/lib/queries/forums'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, ChevronRight, Megaphone, LayoutGrid, Settings2 } from 'lucide-react'
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
        className="relative overflow-hidden py-14 px-4"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, oklch(0.24 0.11 258) 60%, oklch(0.62 0.11 80) 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-[0.07] bg-white" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-[0.05] bg-white" />
        <div className="absolute top-1/2 left-1/3 w-96 h-96 rounded-full opacity-[0.04] bg-white -translate-y-1/2" />

        <div className="relative max-w-3xl mx-auto text-center">
          {/* Cross icon */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm mb-5">
            <span className="text-white font-black text-2xl leading-none">✝</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight mb-3">
            SDA Community
          </h1>
          <p className="text-white/70 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            Stay connected with messages and events from your church.
          </p>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Announcement card */}
        {latestAnnouncement && (
          <Link href="/inbox" className="block group">
            <div className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden hover:-translate-y-0.5">
              {/* Accent header strip */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 border-b border-accent/20">
                <Megaphone className="h-3.5 w-3.5 text-accent shrink-0" />
                <p className="text-xs font-bold text-accent uppercase tracking-widest">
                  Latest Announcement
                </p>
              </div>
              {/* Body */}
              <div className="flex items-start gap-3 px-4 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-foreground leading-snug">
                    {latestAnnouncement.title}
                  </p>
                  {latestAnnouncement.body_md && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {latestAnnouncement.body_md}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40 shrink-0 self-center group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </Link>
        )}

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black text-foreground">Groups</h2>
            <Badge variant="secondary" className="font-mono text-xs">{forums.length}</Badge>
          </div>
          {isModOrAdmin && (
            <Link
              href="/admin/forums"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 text-xs')}
            >
              <Settings2 className="h-3.5 w-3.5" />
              Manage groups
            </Link>
          )}
        </div>

        {/* Forum cards */}
        {forums.length === 0 ? (
          <div className="text-center py-16 border rounded-2xl bg-card">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-bold text-muted-foreground">No groups yet</p>
            {isModOrAdmin && (
              <p className="text-sm mt-2 text-muted-foreground">
                <Link href="/admin/forums/new" className="text-primary underline-offset-4 hover:underline font-medium">
                  Create the first group
                </Link>
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {forums.map(forum => {
              const latestTitle = latestPostByForum[forum.id]
              const accentColor = forum.color ?? 'var(--primary)'
              return (
                <Link key={forum.id} href={`/forums/${forum.id}`} className="group block">
                  <div className="h-full flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">

                    {/* Top color strip */}
                    <div
                      className="h-1.5 w-full shrink-0"
                      style={{ backgroundColor: accentColor }}
                    />

                    <div className="flex flex-col flex-1 p-5">
                      {/* Icon + chevron */}
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-3xl leading-none">{forum.icon ?? '💬'}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-0.5" />
                      </div>

                      {/* Name + description */}
                      <p className="font-bold text-base text-foreground group-hover:text-primary transition-colors leading-snug">
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
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-snug italic">
                            &ldquo;{latestTitle}&rdquo;
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/60">No posts yet</p>
                        )}
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
