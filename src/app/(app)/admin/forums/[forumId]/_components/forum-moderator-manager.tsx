'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

type Mod = { id: string; display_name: string | null; avatar_url: string | null }

type Props = {
  forumId: string
  allMods: Mod[]
  enabledModIds: string[]
}

export function ForumModeratorManager({ forumId, allMods, enabledModIds: initial }: Props) {
  const router = useRouter()
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initial))
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggle(userId: string, on: boolean) {
    setToggling(userId)
    const supabase = createClient()

    if (on) {
      const { error } = await supabase
        .from('forum_moderators')
        .insert({ user_id: userId, forum_id: forumId })
      if (error) {
        toast.error(error.message)
      } else {
        setEnabled(prev => new Set([...prev, userId]))
        toast.success('Pastor assigned to this group')
        router.refresh()
      }
    } else {
      const { error } = await supabase
        .from('forum_moderators')
        .delete()
        .eq('forum_id', forumId)
        .eq('user_id', userId)
      if (error) {
        toast.error(error.message)
      } else {
        setEnabled(prev => { const s = new Set(prev); s.delete(userId); return s })
        toast.success('Pastor removed from this group')
        router.refresh()
      }
    }
    setToggling(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Assigned Pastors
        </CardTitle>
        <CardDescription>
          Choose which pastors can publish, pin, lock, and remove posts in this group.
          Pastors only see compose controls for groups they are assigned to.
          If none are assigned, only admins can publish to this group.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {allMods.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pastors exist yet.{' '}
            <a href="/admin/users" className="underline">Promote a member to pastor first.</a>
          </p>
        ) : (
          <div className="divide-y">
            {allMods.map(mod => {
              const initials = mod.display_name?.slice(0, 2).toUpperCase() ?? '??'
              const isEnabled = enabled.has(mod.id)
              return (
                <div key={mod.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={mod.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <Label htmlFor={`mod-${mod.id}`} className="cursor-pointer flex items-center gap-2 font-normal">
                      {mod.display_name ?? 'Unknown'}
                      {isEnabled && (
                        <Badge variant="secondary" className="text-[10px] py-0">Assigned</Badge>
                      )}
                    </Label>
                  </div>
                  <Switch
                    id={`mod-${mod.id}`}
                    checked={isEnabled}
                    onCheckedChange={checked => toggle(mod.id, checked)}
                    disabled={toggling === mod.id}
                  />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
