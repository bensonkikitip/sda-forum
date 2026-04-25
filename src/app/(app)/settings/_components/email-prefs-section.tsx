'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'

type EmailPrefs = {
  dm_opt_in: boolean
  email_notify_replies: boolean
  email_notify_mentions: boolean
  email_notify_announcements: boolean
}

const TOGGLES: { key: keyof EmailPrefs; label: string; description: string }[] = [
  {
    key: 'dm_opt_in',
    label: 'Allow direct messages',
    description: 'When off, other members cannot start a new DM conversation with you.',
  },
  {
    key: 'email_notify_replies',
    label: 'Email: replies to my posts',
    description: 'When someone replies to a post or comment you wrote.',
  },
  {
    key: 'email_notify_mentions',
    label: 'Email: mentions',
    description: 'When someone @mentions you in a post or comment.',
  },
  {
    key: 'email_notify_announcements',
    label: 'Email: admin announcements',
    description: 'When administrators post a site-wide announcement.',
  },
]

type Props = {
  userId: string
  initialPrefs: EmailPrefs
}

export function EmailPrefsSection({ userId, initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<EmailPrefs>(initialPrefs)
  const [saving, setSaving] = useState<string | null>(null)

  async function handleToggle(key: keyof EmailPrefs, checked: boolean) {
    const prev = prefs[key]
    setPrefs(p => ({ ...p, [key]: checked }))
    setSaving(key)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ [key]: checked })
      .eq('id', userId)

    if (error) {
      toast.error(error.message)
      setPrefs(p => ({ ...p, [key]: prev }))
    }

    setSaving(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Privacy & other emails
        </CardTitle>
        <CardDescription>
          Control direct messages and email alerts for replies, mentions, and announcements.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {TOGGLES.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor={key}>{label}</Label>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch
              id={key}
              checked={prefs[key]}
              onCheckedChange={c => handleToggle(key, c)}
              disabled={saving === key}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
