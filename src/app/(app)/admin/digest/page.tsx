import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireUser, getUserRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Globe, LayoutList } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function AdminDigestPage() {
  const user = await requireUser()
  const role = await getUserRole(user.id)

  // Only admins and moderators can reach this page
  if (role !== 'admin' && role !== 'moderator') redirect('/home')

  const admin = createAdminClient()

  // Fetch forums this user can manage (admins see all; mods see assigned ones)
  let forums: { id: string; name: string; icon: string | null; color: string | null }[] = []
  if (role === 'admin') {
    const { data } = await admin
      .from('forums')
      .select('id, name, icon, color')
      .order('created_at', { ascending: true })
    forums = data ?? []
  } else {
    // Moderator: only assigned forums
    const { data } = await admin
      .from('forum_moderators')
      .select('forum_id, forums!inner(id, name, icon, color)')
      .eq('user_id', user.id)
    forums = (data ?? []).map((r) => {
      const f = Array.isArray(r.forums) ? r.forums[0] : r.forums as { id: string; name: string; icon: string | null; color: string | null }
      return f
    }).filter(Boolean)
  }

  // Fetch the most recent digest_send for each forum (and for site-wide)
  const forumIds = forums.map(f => f.id)

  const [siteLastRes, forumLastRes] = await Promise.all([
    // Site-wide: only admins need this
    role === 'admin'
      ? admin
          .from('digest_sends')
          .select('sent_at, sent_by_user_id, recipient_count')
          .eq('scope', 'site')
          .is('forum_id', null)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Per-forum: most recent send per forum
    forumIds.length > 0
      ? admin
          .from('digest_sends')
          .select('forum_id, sent_at, recipient_count')
          .eq('scope', 'forum')
          .in('forum_id', forumIds)
          .order('sent_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  // Build a map: forum_id → most recent send (the query is ordered desc so first match per forum is latest)
  const latestForumSend: Record<string, { sent_at: string; recipient_count: number }> = {}
  for (const row of (forumLastRes.data ?? [])) {
    const r = row as { forum_id: string; sent_at: string; recipient_count: number }
    if (!latestForumSend[r.forum_id]) {
      latestForumSend[r.forum_id] = { sent_at: r.sent_at, recipient_count: r.recipient_count }
    }
  }

  const siteLastSend = siteLastRes.data as { sent_at: string; recipient_count: number } | null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <AdminNav />

      <div>
        <h1 className="text-2xl font-bold">Digest</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send members a summary of upcoming events. Preview first — then send.
        </p>
      </div>

      {/* ── Site-wide (admins only) ── */}
      {role === 'admin' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Site-wide digest
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {siteLastSend ? (
                <>
                  Last sent{' '}
                  <strong>{formatDistanceToNow(new Date(siteLastSend.sent_at), { addSuffix: true })}</strong>
                  {' '}· {siteLastSend.recipient_count} recipient{siteLastSend.recipient_count !== 1 ? 's' : ''}
                </>
              ) : (
                'Never sent'
              )}
            </div>
            <Link href="/admin/digest/preview?scope=site">
              <Button size="sm" className="gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Prepare site digest
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ── Per-forum digests ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <LayoutList className="h-3.5 w-3.5" />
          Group digests
        </h2>

        {forums.length === 0 ? (
          <p className="text-sm text-muted-foreground">No groups assigned.</p>
        ) : (
          <div className="space-y-2">
            {forums.map(forum => {
              const lastSend = latestForumSend[forum.id]
              return (
                <Card key={forum.id}>
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      {forum.icon && <span className="text-base leading-none">{forum.icon}</span>}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{forum.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {lastSend ? (
                            <>
                              Last sent{' '}
                              <strong>{formatDistanceToNow(new Date(lastSend.sent_at), { addSuffix: true })}</strong>
                              {' '}· {lastSend.recipient_count} recipient{lastSend.recipient_count !== 1 ? 's' : ''}
                            </>
                          ) : (
                            <>
                              Never sent{' '}
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                                First time
                              </Badge>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <Link href={`/admin/digest/preview?scope=forum&forumId=${forum.id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Prepare digest
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
