'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { SignOutButton } from '@/components/sign-out-button'
import { toast } from 'sonner'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EmailPrefs = {
  email_notify_replies: boolean
  email_notify_mentions: boolean
  email_notify_forum_subs: boolean
  email_notify_announcements: boolean
}

const EMAIL_PREF_LABELS: { key: keyof EmailPrefs; label: string; description: string }[] = [
  {
    key: 'email_notify_replies',
    label: 'Replies to my posts',
    description: 'When someone replies to a post or comment you wrote.',
  },
  {
    key: 'email_notify_mentions',
    label: 'Mentions',
    description: 'When someone @mentions you in a post or comment.',
  },
  {
    key: 'email_notify_forum_subs',
    label: 'New posts in subscribed forums',
    description: 'When someone posts in a forum you have subscribed to.',
  },
  {
    key: 'email_notify_announcements',
    label: 'Admin announcements',
    description: 'When administrators post a site-wide announcement.',
  },
]

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [dmOptIn, setDmOptIn] = useState(true)
  const [emailPrefs, setEmailPrefs] = useState<EmailPrefs>({
    email_notify_replies: false,
    email_notify_mentions: false,
    email_notify_forum_subs: false,
    email_notify_announcements: false,
  })
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('dm_opt_in, email_notify_replies, email_notify_mentions, email_notify_forum_subs, email_notify_announcements')
        .eq('id', user.id)
        .maybeSingle()
      if (data) {
        setDmOptIn(data.dm_opt_in ?? true)
        setEmailPrefs({
          email_notify_replies: data.email_notify_replies ?? false,
          email_notify_mentions: data.email_notify_mentions ?? false,
          email_notify_forum_subs: data.email_notify_forum_subs ?? false,
          email_notify_announcements: data.email_notify_announcements ?? false,
        })
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleDmToggle(checked: boolean) {
    setDmOptIn(checked)
    if (!userId) return
    const { error } = await supabase
      .from('profiles')
      .update({ dm_opt_in: checked })
      .eq('id', userId)
    if (error) {
      toast.error(error.message)
      setDmOptIn(!checked)
    } else {
      toast.success(checked ? 'Direct messages enabled' : 'Direct messages disabled')
    }
  }

  async function handleEmailPrefToggle(key: keyof EmailPrefs, checked: boolean) {
    const prev = emailPrefs[key]
    setEmailPrefs(p => ({ ...p, [key]: checked }))
    if (!userId) return
    const { error } = await supabase
      .from('profiles')
      .update({ [key]: checked })
      .eq('id', userId)
    if (error) {
      toast.error(error.message)
      setEmailPrefs(p => ({ ...p, [key]: prev }))
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy</CardTitle>
          <CardDescription>Control who can contact you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="dm-toggle">Allow direct messages</Label>
              <p className="text-xs text-muted-foreground">
                When off, other members cannot start a new DM conversation with you.
              </p>
            </div>
            <Switch
              id="dm-toggle"
              checked={dmOptIn}
              onCheckedChange={handleDmToggle}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email notifications</CardTitle>
          <CardDescription>
            In-app notifications are always on. These switches also send you an email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {EMAIL_PREF_LABELS.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor={key}>{label}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                id={key}
                checked={emailPrefs[key]}
                onCheckedChange={checked => handleEmailPrefToggle(key, checked)}
                disabled={loading}
              />
            </div>
          ))}
        </CardContent>
      </Card>

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
