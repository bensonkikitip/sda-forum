import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { SignOutButton } from '@/components/sign-out-button'
import { TopicPrefsSection } from './_components/topic-prefs-section'
import { ForumSubsSection } from './_components/forum-subs-section'
import { EmailPrefsSection } from './_components/email-prefs-section'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const [
    topicsRes,
    topicPrefsRes,
    forumsRes,
    subRes,
    profileRes,
  ] = await Promise.all([
    supabase
      .from('topics')
      .select('id, name, icon, color')
      .order('sort_order')
      .order('name'),
    supabase
      .from('user_topic_preferences')
      .select('topic_id, notify_inapp, notify_email')
      .eq('user_id', user.id),
    supabase
      .from('forums')
      .select('id, name, icon, color')
      .order('created_at', { ascending: true }),
    supabase
      .from('forum_subscriptions')
      .select('forum_id')
      .eq('user_id', user.id),
    supabase
      .from('profiles')
      .select('dm_opt_in, email_notify_replies, email_notify_mentions, email_notify_announcements')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (!profileRes.data) redirect('/login')

  const topics = topicsRes.data ?? []
  const forums = forumsRes.data ?? []

  const topicPrefsMap: Record<string, { notify_inapp: boolean; notify_email: boolean }> = {}
  for (const row of topicPrefsRes.data ?? []) {
    topicPrefsMap[row.topic_id] = {
      notify_inapp: row.notify_inapp,
      notify_email: row.notify_email,
    }
  }

  const subscribedForumIds = (subRes.data ?? []).map(r => r.forum_id)
  const profile = profileRes.data

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* A: Topic notification preferences */}
      <TopicPrefsSection
        userId={user.id}
        topics={topics}
        initialPrefs={topicPrefsMap}
      />

      {/* B: Forum subscriptions */}
      <ForumSubsSection
        userId={user.id}
        forums={forums}
        initialSubscribedIds={subscribedForumIds}
      />

      {/* C: Email + privacy */}
      <EmailPrefsSection
        userId={user.id}
        initialPrefs={{
          dm_opt_in:                  profile.dm_opt_in                  ?? true,
          email_notify_replies:       profile.email_notify_replies       ?? false,
          email_notify_mentions:      profile.email_notify_mentions      ?? false,
          email_notify_announcements: profile.email_notify_announcements ?? false,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/profile/edit" className={cn(buttonVariants({ variant: 'outline' }))}>
            Edit profile
          </Link>
        </CardContent>
      </Card>

      <Separator />

      <div>
        <p className="text-sm text-muted-foreground mb-3">Signed in to SDA Forum</p>
        <SignOutButton />
      </div>
    </div>
  )
}
