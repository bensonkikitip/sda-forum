import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireUser, getUserRole, canModerateForumId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { previewDigest } from '../_actions'
import { AdminNav } from '@/components/admin-nav'
import { SendDigestButton } from '../_components/send-digest-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Calendar, ChevronLeft, MapPin, Users } from 'lucide-react'
import { format } from 'date-fns'
import { groupEventsByWeek } from '@/lib/utils/dates'

export const dynamic = 'force-dynamic'

export default async function DigestPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; forumId?: string }>
}) {
  const { scope: scopeParam, forumId } = await searchParams
  const scope = (scopeParam === 'site' || scopeParam === 'forum') ? scopeParam : null

  if (!scope) redirect('/admin/digest')

  const user = await requireUser()
  const role = await getUserRole(user.id)

  if (scope === 'site' && role !== 'admin') redirect('/admin/digest')
  if (scope === 'forum' && !forumId)        redirect('/admin/digest')

  if (scope === 'forum' && forumId) {
    const canMod = await canModerateForumId(user.id, forumId)
    if (!canMod) redirect('/admin/digest')
  }

  // Get forum name (for the heading)
  let forumName = ''
  if (scope === 'forum' && forumId) {
    const admin = createAdminClient()
    const { data: forum } = await admin.from('forums').select('name').eq('id', forumId).maybeSingle()
    forumName = forum?.name ?? 'Forum'
  }

  // Fetch preview data
  let preview: Awaited<ReturnType<typeof previewDigest>> | null = null
  let fetchError: string | null = null
  try {
    preview = await previewDigest(scope, forumId)
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Unknown error'
  }

  const heading = scope === 'site'
    ? 'Site-wide digest preview'
    : `${forumName} digest preview`

  const backHref = '/admin/digest'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <AdminNav />

      <div className="flex items-center gap-3">
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{heading}</h1>
      </div>

      {fetchError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {fetchError}
        </div>
      )}

      {preview && (
        <>
          {/* Last sent warning */}
          {preview.daysSinceLastSend !== null && preview.daysSinceLastSend < 60 && (
            <div className="flex items-start gap-3 rounded-md border border-yellow-400/50 bg-yellow-50 dark:bg-yellow-950/30 p-4 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <span>
                Last sent <strong>{preview.daysSinceLastSend} day{preview.daysSinceLastSend !== 1 ? 's' : ''} ago</strong>
                {preview.lastSentByName ? ` by ${preview.lastSentByName}` : ''}. Send again?
              </span>
            </div>
          )}

          {/* Recipient count */}
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold leading-none">{preview.recipientCount}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  member{preview.recipientCount !== 1 ? 's' : ''} will receive this digest
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Events list */}
          {preview.events.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No upcoming events in the next 90 days.
                <p className="mt-1 text-xs">The Send button is disabled until there is at least one event to share.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                {preview.events.length} upcoming event{preview.events.length !== 1 ? 's' : ''} — next 90 days
              </h2>

              {groupEventsByWeek(preview.events).map(({ label, items }) => (
                <div key={label} className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {label}
                  </h3>

                  {items.map((event) => {
                    const e = event as typeof preview.events[0]
                    return (
                      <Card key={e.id} className="overflow-hidden">
                        <CardHeader className="pb-2 pt-4">
                          <CardTitle className="text-sm font-semibold leading-snug">
                            {e.title}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">{e.forum_name}</p>
                        </CardHeader>
                        <CardContent className="pb-4 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(e.event_starts_at), 'EEE, MMM d, yyyy · h:mm a')}
                            {e.event_ends_at && (
                              <> – {format(new Date(e.event_ends_at), 'h:mm a')}</>
                            )}
                          </div>
                          {e.event_location && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              {e.event_location_url ? (
                                <a
                                  href={e.event_location_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {e.event_location}
                                </a>
                              ) : (
                                e.event_location
                              )}
                            </div>
                          )}
                          {e.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {e.topics.map(t => (
                                <Badge
                                  key={t.id}
                                  variant="outline"
                                  className="text-xs px-1.5 py-0"
                                  style={t.color ? {
                                    backgroundColor: t.color + '18',
                                    borderColor:     t.color + '55',
                                    color:           t.color,
                                  } : undefined}
                                >
                                  {t.icon && <span className="mr-1">{t.icon}</span>}
                                  {t.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Link href={backHref}>
              <Button variant="outline">Cancel</Button>
            </Link>
            {preview.events.length > 0 && (
              <SendDigestButton
                scope={scope}
                forumId={forumId}
                expectedEventIds={preview.events.map(e => e.id)}
                expectedRecipientCount={preview.recipientCount}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
