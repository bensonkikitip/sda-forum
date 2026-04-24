import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/server'

// Maps inbox_messages.kind to the profile column that gates email for that type.
const KIND_TO_PREF: Record<string, string> = {
  reply: 'email_notify_replies',
  mention: 'email_notify_mentions',
  forum_post: 'email_notify_forum_subs',
  announcement: 'email_notify_announcements',
}

// Reuse a single transporter across warm lambda invocations.
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
  // Validate shared secret to prevent spoofed webhook calls.
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

  const kind = record.kind as string
  const prefColumn = KIND_TO_PREF[kind]
  // 'system' kind and unknown kinds are never emailed.
  if (!prefColumn) return NextResponse.json({ ok: true })

  const recipientId = record.recipient_id as string
  const title = (record.title as string | null) ?? 'New notification'
  const msgBody = (record.body as string | null) ?? ''
  const link = (record.link as string | null) ?? ''

  const admin = createAdminClient()

  // Fetch all email prefs and ban status — select explicit columns to keep TypeScript happy.
  const { data: profile } = await admin
    .from('profiles')
    .select('is_banned, email_notify_replies, email_notify_mentions, email_notify_forum_subs, email_notify_announcements')
    .eq('id', recipientId)
    .maybeSingle() as { data: {
      is_banned: boolean
      email_notify_replies: boolean
      email_notify_mentions: boolean
      email_notify_forum_subs: boolean
      email_notify_announcements: boolean
    } | null }

  if (!profile || profile.is_banned) {
    return NextResponse.json({ ok: true })
  }

  const wantsEmail = profile[prefColumn as keyof typeof profile]
  if (!wantsEmail) {
    return NextResponse.json({ ok: true })
  }

  // Fetch the recipient's email address from auth.users (requires service role).
  const { data: authUser } = await admin.auth.admin.getUserById(recipientId)
  const email = authUser?.user?.email
  if (!email) return NextResponse.json({ ok: true })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const fullLink = link ? `${siteUrl}${link}` : siteUrl

  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: title,
      text: `${msgBody}\n\n${fullLink}`,
      html: `<p>${msgBody}</p>${link ? `<p><a href="${fullLink}">View on SDA Community →</a></p>` : ''}`,
    })
  } catch (err) {
    console.error('Email send failed:', err)
    // Still return 200 so Supabase doesn't keep retrying — email errors are non-fatal.
    return NextResponse.json({ ok: true, warning: 'Email failed' })
  }

  return NextResponse.json({ ok: true })
}
