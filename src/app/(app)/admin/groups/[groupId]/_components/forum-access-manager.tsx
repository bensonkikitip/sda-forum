'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

type Forum = { id: string; name: string; icon: string | null }

type Props = {
  groupId: string
  allForums: Forum[]
  enabledForumIds: string[]
}

export function ForumAccessManager({ groupId, allForums, enabledForumIds: initial }: Props) {
  const router = useRouter()
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initial))
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggle(forumId: string, on: boolean) {
    setToggling(forumId)
    const supabase = createClient()

    if (on) {
      const { error } = await supabase
        .from('forum_groups')
        .insert({ forum_id: forumId, group_id: groupId })
      if (error) {
        toast.error(error.message)
      } else {
        setEnabled(prev => new Set([...prev, forumId]))
        toast.success('Group access granted')
        router.refresh()
      }
    } else {
      const { error } = await supabase
        .from('forum_groups')
        .delete()
        .eq('forum_id', forumId)
        .eq('group_id', groupId)
      if (error) {
        toast.error(error.message)
      } else {
        setEnabled(prev => { const s = new Set(prev); s.delete(forumId); return s })
        toast.success('Group access removed')
        router.refresh()
      }
    }
    setToggling(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Group Access</CardTitle>
        <CardDescription>
          Toggle which groups this audience can see. Groups with no audience restrictions are visible to everyone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {allForums.length === 0 ? (
          <p className="text-sm text-muted-foreground">No groups created yet.</p>
        ) : (
          allForums.map(f => (
            <div key={f.id} className="flex items-center justify-between gap-4">
              <Label htmlFor={`forum-${f.id}`} className="flex items-center gap-2 cursor-pointer">
                <span className="text-lg">{f.icon ?? '💬'}</span>
                <span>{f.name}</span>
              </Label>
              <Switch
                id={`forum-${f.id}`}
                checked={enabled.has(f.id)}
                onCheckedChange={checked => toggle(f.id, checked)}
                disabled={toggling === f.id}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
