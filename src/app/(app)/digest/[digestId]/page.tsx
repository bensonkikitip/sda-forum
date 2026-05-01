import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, Calendar, CalendarDays, ChevronLeft, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { groupEventsByWeek } from '@/lib/utils/dates'

export const dynamic = 'force-dynamic'

type TopicRow = { id: string; name: string; icon: string | null; color: string | null }

type DigestEvent = {
  id: string
  title: string
  event_starts_at: string
  event_ends_at: string | null
  event_location: string | null
  event_location_url: string | null
  forum_id: string
  topics: TopicRow[]
}

export default async function DigestPage({
  params,
}: {
  params: Promise<{ digestId: string }>
}) {
  const { digestId } = await params
  const user = await requireUser()

  // Load the digest_sends row (admin client — RLS would prevent non-senders from reading)
  const admin = createAdminClient()
  const { data: digestSend } = await admin
    .from('digest_sends')
    .select('id, scope, forum_id, window_start, window_end, sent_at, recipient_count')
    .eq('id', digestId)
    .maybeSingle()

  if (!digestSend) notFound()

  // Load forum name if forum-scoped
  let forumName = ''
  if (digestSend.scope === 'forum' && digestSend.forum_id) {
    const { data: forum } = await admin
      .from('forums')
      .select('name')
      .eq('id', digestSend.forum_id)
      .maybeSingle()
    forumName = forum?.name ?? 'Group'
  }

  // Use the user's regular client — RLS filters to events they can see
  const supabase = await createClient()
  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let eventsQuery: any = supabase
    .from('posts')
    .select(`
      id, title, event_starts_at, event_ends_at, event_location, event_location_url, forum_id,
      post_topics(topic_id, topics(id, name, icon, color))
    `)
    .not('event_starts_at', 'is', null)
    .gt('event_starts_at', now)                        // exclude events that have already passed
    .lte('event_starts_at', digestSend.window_end)     // stay within the original window
    .eq('is_removed', false)
    .order('event_starts_at', { ascending: true })

  if (digestSend.scope === 'forum' && digestSend.forum_id) {
    eventsQuery = eventsQuery.eq('forum_id', digestSend.forum_id)
  }

  const { data: rawEvents } = await eventsQuery

  // Normalise nested topics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: DigestEvent[] = (rawEvents ?? []).map((e: any) => ({
    id:                 e.id,
    title:              e.title,
    event_starts_at:    e.event_starts_at,
    event_ends_at:      e.event_ends_at ?? null,
    event_location:     e.event_location ?? null,
    event_location_url: e.event_location_url ?? null,
    forum_id:           e.forum_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    topics: (e.post_topics ?? []).map((pt: any) => {
      const t = Array.isArray(pt.topics) ? pt.topics[0] : pt.topics
      return t ? { id: t.id, name: t.name, icon: t.icon ?? null, color: t.color ?? null } : null
    }).filter(Boolean) as TopicRow[],
  }))

  // Fetch the user's enabled topic IDs (to show nudges for unenabled topics)
  const { data: topicPrefs } = await supabase
    .from('user_topic_preferences')
    .select('topic_id')
    .eq('user_id', user.id)
    .eq('notify_inapp', true)

  const enabledTopicIds = new Set((topicPrefs ?? []).map((p) => p.topic_id))

  const heading = digestSend.scope === 'site'
    ? 'Upcoming events — next 90 days'
    : `${forumName} — upcoming events`

  const grouped = groupEventsByWeek(events)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/inbox"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to inbox
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">{heading}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Sent {format(new Date(digestSend.sent_at), 'MMMM d, yyyy')}
          {' · '}{digestSend.recipient_count} recipient{digestSend.recipient_count !== 1 ? 's' : ''}
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
            All events from this digest have already passed, or none are visible to you.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ label, items }) => (
            <div key={label} className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {label}
              </h2>

              {items.map(event => {
                // Find topics the user hasn't enabled yet
                const unenabled = event.topics.filter(t => !enabledTopicIds.has(t.id))

                return (
                  <Card key={event.id}>
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-sm font-semibold leading-snug">
                        <Link
                          href={`/posts/${event.id}`}
                          className="hover:underline"
                        >
                          {event.title}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {format(new Date(event.event_starts_at), 'EEE, MMM d, yyyy · h:mm a')}
                        {event.event_ends_at && (
                          <> – {format(new Date(event.event_ends_at), 'h:mm a')}</>
                        )}
                      </div>
                      {event.event_location && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {event.event_location_url ? (
                            <a
                              href={event.event_location_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {event.event_location}
                            </a>
                          ) : (
                            event.event_location
                          )}
                        </div>
                      )}
                      {event.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {event.topics.map(t => (
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

                      {/* Topic nudges: show for topics the user hasn't enabled */}
                      {unenabled.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {unenabled.map(t => (
                            <Link
                              key={t.id}
                              href="/settings"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Bell className="h-3 w-3" />
                              Turn on {t.name} notifications
                            </Link>
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
    </div>
  )
}
