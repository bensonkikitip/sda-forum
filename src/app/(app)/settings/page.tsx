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
import { Map } from 'lucide-react'
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
    userRegionRes,
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
      .select('dm_opt_in, email_notify_replies, email_notify_mentions, email_notify_announcements, email_notify_digest, church_id')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('churches(region_id, regions(id, name))')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (!profileRes.data) redirect('/login')

  const topics = topicsRes.data ?? []
  const forums = forumsRes.data ?? []

  // Explicit type so TS knows about email_notify_digest (added in migration 18)
  type ProfileRow = {
    dm_opt_in: boolean | null
    email_notify_replies: boolean | null
    email_notify_mentions: boolean | null
    email_notify_announcements: boolean | null
    email_notify_digest: boolean | null
    church_id: string | null
  }
  const profile = profileRes.data as unknown as ProfileRow

  const topicPrefsMap: Record<string, { notify_inapp: boolean; notify_email: boolean }> = {}
  for (const row of topicPrefsRes.data ?? []) {
    topicPrefsMap[row.topic_id] = {
      notify_inapp: row.notify_inapp,
      notify_email: row.notify_email,
    }
  }

  const subscribedForumIds = (subRes.data ?? []).map(r => r.forum_id)

  // Resolve the user's region (via their church). Query result shape from the
  // nested join can be either an array or an object — normalise both.
  type RegionRow = { id: string; name: string }
  type ChurchRow = { region_id: string | null; regions: RegionRow | RegionRow[] | null }
  const userRegionData = userRegionRes.data as
    | { churches: ChurchRow | ChurchRow[] | null }
    | null
  const churchObj = Array.isArray(userRegionData?.churches)
    ? userRegionData?.churches[0]
    : userRegionData?.churches
  const regionObj = Array.isArray(churchObj?.regions)
    ? churchObj?.regions[0]
    : churchObj?.regions
  const userRegion: RegionRow | null = regionObj ?? null

  // Count how many of the user's subscribed forums are scoped to their region
  let regionForumCount = 0
  if (userRegion) {
    const { data: regionForums } = await supabase
      .from('forum_regions')
      .select('forum_id')
      .eq('region_id', userRegion.id)
    const regionForumIds = new Set((regionForums ?? []).map(r => r.forum_id))
    regionForumCount = subscribedForumIds.filter(id => regionForumIds.has(id)).length
  }

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

      {/* B2: My region (read-only summary) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Map className="h-4 w-4" /> My region
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {userRegion ? (
            <>
              <p>
                You&rsquo;re in <span className="font-semibold text-foreground">{userRegion.name}</span>.
              </p>
              <p className="text-muted-foreground">
                {regionForumCount === 0
                  ? 'No region-scoped forums yet — you only see site-wide content.'
                  : `Auto-subscribed to ${regionForumCount} region-scoped forum${regionForumCount === 1 ? '' : 's'}.`}
              </p>
            </>
          ) : profile.church_id ? (
            <p className="text-muted-foreground">
              Your church isn&rsquo;t assigned to a region yet. Ask an admin to assign it for region-scoped announcements.
            </p>
          ) : (
            <p className="text-muted-foreground">
              No church set on your profile. <Link href="/profile/edit" className="underline">Add your church</Link> to receive region-scoped content.
            </p>
          )}
        </CardContent>
      </Card>

      {/* C: Email + privacy */}
      <EmailPrefsSection
        userId={user.id}
        initialPrefs={{
          dm_opt_in:                  profile.dm_opt_in                  ?? true,
          email_notify_replies:       profile.email_notify_replies       ?? false,
          email_notify_mentions:      profile.email_notify_mentions      ?? false,
          email_notify_announcements: profile.email_notify_announcements ?? false,
          email_notify_digest:        profile.email_notify_digest        ?? false,
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
