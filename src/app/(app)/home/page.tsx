import Link from 'next/link'
import { requireUser, getUserRole } from '@/lib/auth'
import { getForums } from '@/lib/queries/forums'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await requireUser()
  const [role, forums, announcementResult] = await Promise.all([
    getUserRole(user.id),
    getForums(),
    createClient().then(s => s.from('announcements').select('id, title, body_md, created_at').order('created_at', { ascending: false }).limit(1)),
  ])

  const latestAnnouncement = announcementResult.data?.[0]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* Announcement banner */}
      {latestAnnouncement && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Announcement</p>
          <p className="font-medium">{latestAnnouncement.title}</p>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{latestAnnouncement.body_md}</p>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Forums</h1>
        {(role === 'admin' || role === 'moderator') && (
          <Link href="/admin/forums" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Manage forums →
          </Link>
        )}
      </div>

      {/* Forum list */}
      {forums.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No forums yet</p>
            {(role === 'admin') && (
              <p className="text-sm mt-1">
                <Link href="/admin/forums" className="underline hover:no-underline">Create the first forum</Link>
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {forums.map(forum => (
            <Link key={forum.id} href={`/forums/${forum.id}`}>
              <div className="flex items-center gap-4 p-4 rounded-lg border hover:border-foreground/20 hover:bg-muted/30 transition-all group">
                {/* Icon */}
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: forum.color ? `${forum.color}20` : undefined }}
                >
                  {forum.icon ?? '💬'}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold group-hover:text-primary transition-colors">{forum.name}</p>
                  {forum.description && (
                    <p className="text-sm text-muted-foreground truncate">{forum.description}</p>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
