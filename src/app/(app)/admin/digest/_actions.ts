'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { canModerateForumId, getUserRole } from '@/lib/auth'
import { eventIdsEqual } from '@/lib/digest/event-ids'

// How far ahead to include events in a digest
const WINDOW_DAYS = 90

// ── Types ────────────────────────────────────────────────────────────────────

export type DigestEvent = {
  id: string
  title: string
  event_starts_at: string
  event_ends_at: string | null
  event_location: string | null
  event_location_url: string | null
  forum_id: string
  forum_name: string
  topics: { id: string; name: string; icon: string | null; color: string | null }[]
}

export type PreviewResult = {
  events: DigestEvent[]
  recipientCount: number
  lastSentAt: string | null
  lastSentByName: string | null
  daysSinceLastSend: number | null
  windowStart: string
  windowEnd: string
}

export type SendResult =
  | { ok: true;  digestId: string }
  | { ok: false; error: string }

// ── previewDigest ─────────────────────────────────────────────────────────────
// Returns the data that will appear on the preview page — no DB writes.

export async function previewDigest(
  scope: 'site' | 'forum',
  forumId?: string,
): Promise<PreviewResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const role = await getUserRole(user.id)

  if (scope === 'site' && role !== 'admin') {
    throw new Error('Only admins can preview site-wide digests')
  }
  if (scope === 'forum') {
    if (!forumId) throw new Error('forumId required for forum scope')
    const canMod = await canModerateForumId(user.id, forumId)
    if (!canMod) throw new Error('Not authorized to moderate this forum')
  }

  const now       = new Date()
  const windowStart = now.toISOString()
  const windowEnd   = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Use admin client so we can read every forum's events regardless of group visibility
  const admin = createAdminClient()

  // Fetch upcoming events in the window
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let eventsQuery: any = admin
    .from('posts')
    .select(`
      id, title, event_starts_at, event_ends_at, event_location, event_location_url, forum_id,
      forums!inner(name),
      post_topics(topic_id, topics(id, name, icon, color))
    `)
    .not('event_starts_at', 'is', null)
    .gt('event_starts_at', windowStart)
    .lte('event_starts_at', windowEnd)
    .eq('is_removed', false)
    .order('event_starts_at', { ascending: true })

  if (scope === 'forum' && forumId) {
    eventsQuery = eventsQuery.eq('forum_id', forumId)
  }

  const { data: rawEvents } = await eventsQuery

  // Normalise nested joins — Supabase can return arrays or objects depending on FK direction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: DigestEvent[] = (rawEvents ?? []).map((e: any) => {
    const forumsVal = Array.isArray(e.forums) ? e.forums[0] : e.forums
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topics = (e.post_topics ?? []).map((pt: any) => {
      const t = Array.isArray(pt.topics) ? pt.topics[0] : pt.topics
      return t
        ? { id: t.id, name: t.name, icon: t.icon ?? null, color: t.color ?? null }
        : null
    }).filter(Boolean)

    return {
      id:                  e.id,
      title:               e.title,
      event_starts_at:     e.event_starts_at,
      event_ends_at:       e.event_ends_at ?? null,
      event_location:      e.event_location ?? null,
      event_location_url:  e.event_location_url ?? null,
      forum_id:            e.forum_id,
      forum_name:          forumsVal?.name ?? '',
      topics,
    }
  })

  // Count recipients
  let recipientCount = 0
  if (scope === 'site') {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_banned', false)
    recipientCount = count ?? 0
  } else if (scope === 'forum' && forumId) {
    const { data: countData } = await admin.rpc('count_forum_recipients', { p_forum_id: forumId })
    recipientCount = Number(countData ?? 0)
  }

  // Last sent info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastSendQuery: any = admin
    .from('digest_sends')
    .select('sent_at, sent_by_user_id')
    .eq('scope', scope)
    .order('sent_at', { ascending: false })
    .limit(1)

  if (scope === 'forum' && forumId) {
    lastSendQuery = lastSendQuery.eq('forum_id', forumId)
  } else {
    lastSendQuery = lastSendQuery.is('forum_id', null)
  }

  const { data: lastSend } = await lastSendQuery.maybeSingle()

  let lastSentAt: string | null = null
  let lastSentByName: string | null = null
  let daysSinceLastSend: number | null = null

  if (lastSend) {
    lastSentAt = lastSend.sent_at
    daysSinceLastSend = Math.floor(
      (Date.now() - new Date(lastSend.sent_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (lastSend.sent_by_user_id) {
      const { data: senderProfile } = await admin
        .from('profiles')
        .select('display_name')
        .eq('id', lastSend.sent_by_user_id)
        .maybeSingle()
      lastSentByName = senderProfile?.display_name ?? null
    }
  }

  return {
    events,
    recipientCount,
    lastSentAt,
    lastSentByName,
    daysSinceLastSend,
    windowStart,
    windowEnd,
  }
}

// ── sendDigest ────────────────────────────────────────────────────────────────
// Validates, recomputes events + recipients, compares with expected values,
// then fans out inbox_messages and writes a digest_sends row.

export async function sendDigest(
  scope: 'site' | 'forum',
  forumId: string | undefined,
  expectedEventIds: string[],
  expectedRecipientCount: number,
): Promise<SendResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const role = await getUserRole(user.id)

  if (scope === 'site' && role !== 'admin') {
    return { ok: false, error: 'Only admins can send site-wide digests' }
  }
  if (scope === 'forum') {
    if (!forumId) return { ok: false, error: 'forumId required' }
    const canMod = await canModerateForumId(user.id, forumId)
    if (!canMod) return { ok: false, error: 'Not authorized to moderate this forum' }
  }

  const now = new Date()
  const windowStart = now.toISOString()
  const windowEnd   = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const admin = createAdminClient()

  // ── Re-compute current events ──────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let eventsQuery: any = admin
    .from('posts')
    .select('id')
    .not('event_starts_at', 'is', null)
    .gt('event_starts_at', windowStart)
    .lte('event_starts_at', windowEnd)
    .eq('is_removed', false)

  if (scope === 'forum' && forumId) {
    eventsQuery = eventsQuery.eq('forum_id', forumId)
  }

  const { data: currentEvents } = await eventsQuery
  const currentEventIds = (currentEvents ?? []).map((e: { id: string }) => e.id)

  if (!eventIdsEqual(currentEventIds, expectedEventIds)) {
    return { ok: false, error: 'Content changed since preview — please preview again' }
  }

  // ── Re-compute recipients ──────────────────────────────────────────────────
  let recipientIds: string[] = []
  if (scope === 'site') {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id')
      .eq('is_banned', false)
    recipientIds = (profiles ?? []).map(p => p.id)
  } else if (scope === 'forum' && forumId) {
    const { data: recipData } = await admin.rpc('get_forum_recipient_ids', { p_forum_id: forumId })
    recipientIds = (recipData ?? []).map((r: { user_id: string }) => r.user_id)
  }

  if (recipientIds.length !== expectedRecipientCount) {
    return { ok: false, error: 'Content changed since preview — please preview again' }
  }

  // ── Insert digest_sends row (get its id for the inbox link) ──────────────
  const { data: digestSendRow, error: dsError } = await admin
    .from('digest_sends')
    .insert({
      sent_by_user_id: user.id,
      scope,
      forum_id:        forumId ?? null,
      recipient_count: recipientIds.length,
      window_start:    windowStart,
      window_end:      windowEnd,
    })
    .select('id')
    .single()

  if (dsError || !digestSendRow) {
    return { ok: false, error: dsError?.message ?? 'Failed to create digest record' }
  }

  const digestId    = digestSendRow.id
  const scopeLabel  = scope === 'site' ? 'Site-wide' : 'Forum'
  const msgTitle    = `${scopeLabel} digest — upcoming events (next ${WINDOW_DAYS} days)`
  const msgBody     = `${currentEventIds.length} upcoming event${currentEventIds.length !== 1 ? 's' : ''} in the next ${WINDOW_DAYS} days.`
  const link        = `/digest/${digestId}`

  // ── Fan out inbox_messages in batches of 500 ─────────────────────────────
  const messages = recipientIds.map(recipientId => ({
    recipient_id: recipientId,
    kind:         'digest',
    title:        msgTitle,
    body:         msgBody,
    link,
  }))

  const BATCH_SIZE = 500
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const { error: msgError } = await admin
      .from('inbox_messages')
      .insert(messages.slice(i, i + BATCH_SIZE))
    if (msgError) {
      console.error('Digest inbox insert error (batch starting at', i, '):', msgError)
    }
  }

  revalidatePath('/admin/digest')

  return { ok: true, digestId }
}
