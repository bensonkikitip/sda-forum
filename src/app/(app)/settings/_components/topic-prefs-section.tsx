'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tag } from 'lucide-react'
import { toast } from 'sonner'

type Topic = {
  id: string
  name: string
  icon: string | null
  color: string | null
}

type TopicPref = {
  notify_inapp: boolean
  notify_email: boolean
}

type Props = {
  userId: string
  topics: Topic[]
  // Map of topic_id → current pref (absent = not opted in)
  initialPrefs: Record<string, TopicPref>
}

export function TopicPrefsSection({ userId, topics, initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<Record<string, TopicPref>>(initialPrefs)
  const [saving, setSaving] = useState<string | null>(null) // topic id currently saving

  async function handleToggle(
    topicId: string,
    field: 'notify_inapp' | 'notify_email',
    checked: boolean
  ) {
    const current = prefs[topicId] ?? { notify_inapp: false, notify_email: false }
    const updated = { ...current, [field]: checked }

    // Optimistic update
    setPrefs(p => ({ ...p, [topicId]: updated }))
    setSaving(topicId)

    const supabase = createClient()

    if (!updated.notify_inapp && !updated.notify_email) {
      // Both off → delete the row entirely
      const { error } = await supabase
        .from('user_topic_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('topic_id', topicId)
      if (error) {
        toast.error(error.message)
        setPrefs(p => ({ ...p, [topicId]: current }))
      }
    } else {
      // Upsert the row
      const { error } = await supabase
        .from('user_topic_preferences')
        .upsert(
          { user_id: userId, topic_id: topicId, ...updated },
          { onConflict: 'user_id,topic_id' }
        )
      if (error) {
        toast.error(error.message)
        setPrefs(p => ({ ...p, [topicId]: current }))
      }
    }

    setSaving(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Which kinds of updates do you want?
        </CardTitle>
        <CardDescription>
          You'll only receive notifications for posts tagged with topics you've enabled here.
          Posts with no topics notify everyone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-2 pb-2 border-b">
          <div className="flex-1" />
          <span className="w-16 text-center text-xs font-medium text-muted-foreground">In-app</span>
          <span className="w-16 text-center text-xs font-medium text-muted-foreground">Email</span>
        </div>

        {topics.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No topics have been created yet.
          </p>
        )}

        {topics.map(t => {
          const pref = prefs[t.id] ?? { notify_inapp: false, notify_email: false }
          const isSaving = saving === t.id
          return (
            <div key={t.id} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {t.icon && (
                  <span
                    className="h-7 w-7 rounded-md flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: t.color ? `${t.color}18` : undefined }}
                  >
                    {t.icon}
                  </span>
                )}
                <span className="font-medium text-sm">{t.name}</span>
              </div>
              <div className="w-16 flex justify-center">
                <Switch
                  checked={pref.notify_inapp}
                  onCheckedChange={c => handleToggle(t.id, 'notify_inapp', c)}
                  disabled={isSaving}
                  size="sm"
                />
              </div>
              <div className="w-16 flex justify-center">
                <Switch
                  checked={pref.notify_email}
                  onCheckedChange={c => handleToggle(t.id, 'notify_email', c)}
                  disabled={isSaving}
                  size="sm"
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
