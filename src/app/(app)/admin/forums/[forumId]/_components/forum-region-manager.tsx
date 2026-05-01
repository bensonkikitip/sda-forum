'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type Region = { id: string; name: string; description: string | null }

type Props = {
  forumId: string
  allRegions: Region[]
  enabledRegionIds: string[]
}

export function ForumRegionManager({
  forumId,
  allRegions,
  enabledRegionIds: initial,
}: Props) {
  const router = useRouter()
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initial))
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggle(regionId: string, on: boolean) {
    setToggling(regionId)
    const supabase = createClient()

    if (on) {
      const { error } = await supabase
        .from('forum_regions')
        .insert({ forum_id: forumId, region_id: regionId })
      if (error) {
        toast.error(error.message)
      } else {
        setEnabled(prev => new Set([...prev, regionId]))
        toast.success('Region added — members in this region will see this forum')
        router.refresh()
      }
    } else {
      const { error } = await supabase
        .from('forum_regions')
        .delete()
        .eq('forum_id', forumId)
        .eq('region_id', regionId)
      if (error) {
        toast.error(error.message)
      } else {
        setEnabled(prev => {
          const s = new Set(prev)
          s.delete(regionId)
          return s
        })
        toast.success('Region removed')
        router.refresh()
      }
    }
    setToggling(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Region Scope</CardTitle>
        <CardDescription>
          Pick the regions whose members should auto-subscribe to this forum. Combined with Group Visibility — a member can see the forum if they match either dimension.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {allRegions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No regions yet. <a href="/admin/regions" className="underline">Create a region first.</a>
          </p>
        ) : (
          <div className="divide-y">
            {allRegions.map(r => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="space-y-0.5 min-w-0">
                  <Label
                    htmlFor={`region-${r.id}`}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    {r.name}
                    {enabled.has(r.id) && (
                      <Badge variant="secondary" className="text-[10px] py-0">
                        Active
                      </Badge>
                    )}
                  </Label>
                  {r.description && (
                    <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                  )}
                </div>
                <Switch
                  id={`region-${r.id}`}
                  checked={enabled.has(r.id)}
                  onCheckedChange={checked => toggle(r.id, checked)}
                  disabled={toggling === r.id}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
