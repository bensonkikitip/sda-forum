'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Globe, Lock } from 'lucide-react'
import { toast } from 'sonner'

type Group = { id: string; name: string; description: string | null }

type Props = {
  forumId: string
  allGroups: Group[]
  enabledGroupIds: string[]
}

export function ForumGroupManager({ forumId, allGroups, enabledGroupIds: initial }: Props) {
  const router = useRouter()
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initial))
  const [toggling, setToggling] = useState<string | null>(null)

  const isRestricted = enabled.size > 0

  async function toggle(groupId: string, on: boolean) {
    setToggling(groupId)
    const supabase = createClient()

    if (on) {
      const { error } = await supabase
        .from('forum_groups')
        .insert({ forum_id: forumId, group_id: groupId })
      if (error) {
        toast.error(error.message)
      } else {
        setEnabled(prev => new Set([...prev, groupId]))
        toast.success('Group added — members of this group can now see this forum')
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
        setEnabled(prev => { const s = new Set(prev); s.delete(groupId); return s })
        toast.success('Group removed')
        router.refresh()
      }
    }
    setToggling(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Group Visibility</CardTitle>
        <CardDescription>
          Control which groups can see this forum. Turn on a group to restrict access to its members.
          If no groups are enabled the forum is visible to <strong>all members</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Current visibility status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${isRestricted ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
          {isRestricted
            ? <><Lock className="h-4 w-4 shrink-0" /> Restricted — only members of the enabled groups below can see this forum.</>
            : <><Globe className="h-4 w-4 shrink-0" /> Open — all members can see this forum.</>
          }
        </div>

        {allGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No groups exist yet. <a href="/admin/groups" className="underline">Create a group first.</a>
          </p>
        ) : (
          <div className="divide-y">
            {allGroups.map(g => (
              <div key={g.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="space-y-0.5 min-w-0">
                  <Label htmlFor={`group-${g.id}`} className="cursor-pointer flex items-center gap-2">
                    {g.name}
                    {enabled.has(g.id) && <Badge variant="secondary" className="text-[10px] py-0">Active</Badge>}
                  </Label>
                  {g.description && (
                    <p className="text-xs text-muted-foreground truncate">{g.description}</p>
                  )}
                </div>
                <Switch
                  id={`group-${g.id}`}
                  checked={enabled.has(g.id)}
                  onCheckedChange={checked => toggle(g.id, checked)}
                  disabled={toggling === g.id}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
