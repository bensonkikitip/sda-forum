import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/server'
import { parsePostIdFromLink } from '@/lib/utils/notification-link'

// Maps inbox_messages.kind to the profile column that gates email.
// 'forum_post' is handled separately (requires per-topic check).
const KIND_TO_PREF: Record<string, string> = {
  reply:        'email_notify_replies',
  mention:      'email_notify_mentions',
  announcement: 'email_notify_announcements',
  digest:       'email_notify_digest',
}

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: Number(process.env.SMTP_PORT ?? 465) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  }
  return transporter
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (!secret || secret !== process.env.NOTIFICATION_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { record?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const record = body.record
  if (!record) return NextResponse.json({ ok: true })

  const kind        = record.kind as string
  const recipientId = record.recipient_id as string
  const title       = (record.title as string | null) ?? 'New notification'
  const msgBody     = (record.body  as string | null) ?? ''
  const link        = (record.link  as string | null) ?? ''

  if (kind === 'system') return NextResponse.json({ ok: true })

  const admin = createAdminClient()

  // ── Fetch recipient profile ──────────────────────────────────────────────
  const { data: profile } = await admin
    .from('profiles')
    .select(
      'is_banned, email_notify_replies, email_notify_mentions, ' +
      'email_notify_announcements, email_notify_forum_subs, email_notify_digest'
    )
    .eq('id', recipientId)
    .maybeSingle() as {
      data: {
        is_banned: boolean
        email_notify_replies: boolean
        email_notify_mentions: boolean
        email_notify_announcements: boolean
        email_notify_forum_subs: boolean
        email_notify_digest: boolean
      } | null
    }

  if (!profile || profile.is_banned) return NextResponse.json({ ok: true })

  // ── Determine whether this recipient wants an email ──────────────────────
  let wantsEmail = false

  if (kind === 'forum_post') {
    // Parse post id from link "/posts/<uuid>"
    const postId = parsePostIdFromLink(link)

    if (postId) {
      const { data: ptRows } = await admin
        .from('post_topics')
        .select('topic_id')
        .eq('post_id', postId)

      const topicIds = (ptRows ?? []).map(r => r.topic_id)

      if (topicIds.length > 0) {
        // Post has topics → email only if user opted into at least one via notify_email
        const { data: pref } = await admin
          .from('user_topic_preferences')
          .select('topic_id')
          .eq('user_id', recipientId)
          .eq('notify_email', true)
          .in('topic_id', topicIds)
          .limit(1)
          .maybeSingle()
        wantsEmail = !!pref
      } else {
        // No topics → legacy forum_subs flag
        wantsEmail = !!profile.email_notify_forum_subs
      }
    } else {
      wantsEmail = !!profile.email_notify_forum_subs
    }
  } else {
    const prefColumn = KIND_TO_PREF[kind]
    if (!prefColumn) return NextResponse.json({ ok: true })
    wantsEmail = !!profile[prefColumn as keyof typeof profile]
  }

  if (!wantsEmail) return NextResponse.json({ ok: true })

  // ── Send the email ───────────────────────────────────────────────────────
  const { data: authUser } = await admin.auth.admin.getUserById(recipientId)
  const email = authUser?.user?.email
  if (!email) return NextResponse.json({ ok: true })

  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const fullLink = link ? `${siteUrl}${link}` : siteUrl

  try {
    await getTransporter().sendMail({
      from:    process.env.SMTP_FROM,
      to:      email,
      subject: title,
      text:    `${msgBody}\n\n${fullLink}`,
      html:    `<p>${msgBody}</p>${link ? `<p><a href="${fullLink}">View on SDA Community →</a></p>` : ''}`,
    })
  } catch (err) {
    console.error('Email send failed:', err)
    return NextResponse.json({ ok: true, warning: 'Email failed' })
  }

  return NextResponse.json({ ok: true })
}
