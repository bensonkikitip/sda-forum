'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

type Forum = {
  id: string
  name: string
  icon: string | null
  color: string | null
}

type Props = {
  userId: string
  forums: Forum[]
  initialSubscribedIds: string[]
}

export function ForumSubsSection({ userId, forums, initialSubscribedIds }: Props) {
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set(initialSubscribedIds))
  const [saving, setSaving] = useState<string | null>(null)

  async function handleToggle(forumId: string, checked: boolean) {
    const prev = subscribed.has(forumId)
    // Optimistic update
    setSubscribed(s => {
      const next = new Set(s)
      if (checked) next.add(forumId)
      else next.delete(forumId)
      return next
    })
    setSaving(forumId)

    const supabase = createClient()
    let error: { message: string } | null = null

    if (checked) {
      const res = await supabase
        .from('forum_subscriptions')
        .insert({ user_id: userId, forum_id: forumId })
      error = res.error
    } else {
      const res = await supabase
        .from('forum_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('forum_id', forumId)
      error = res.error
    }

    if (error) {
      toast.error(error.message)
      // Roll back
      setSubscribed(s => {
        const next = new Set(s)
        if (prev) next.add(forumId)
        else next.delete(forumId)
        return next
      })
    }

    setSaving(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Who do you want to hear from?
        </CardTitle>
        <CardDescription>
          Subscribe to groups to receive in-app notifications when new posts are published.
          You still need topic preferences above to control which posts actually notify you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {forums.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No groups are visible to you yet.
          </p>
        )}

        {forums.map(f => (
          <div
            key={f.id}
            className="flex items-center justify-between gap-3 py-2 px-2 rounded-md hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span
                className="h-7 w-7 rounded-md flex items-center justify-center text-sm shrink-0"
                style={{ backgroundColor: f.color ? `${f.color}18` : 'var(--muted)' }}
              >
                {f.icon ?? <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
              <span className="font-medium text-sm truncate">{f.name}</span>
            </div>
            <Switch
              checked={subscribed.has(f.id)}
              onCheckedChange={c => handleToggle(f.id, c)}
              disabled={saving === f.id}
              size="sm"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
