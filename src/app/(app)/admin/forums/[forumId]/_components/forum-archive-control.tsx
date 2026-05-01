'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Archive, ArchiveRestore, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  forumId: string
  isArchived: boolean
}

export function ForumArchiveControl({ forumId, isArchived }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('forums')
      .update({ is_archived: !isArchived })
      .eq('id', forumId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(isArchived ? 'Group unarchived.' : 'Group archived.')
      router.refresh()
    }
    setLoading(false)
  }

  if (isArchived) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-amber-800">
            <Archive className="h-4 w-4" />
            This group is archived
          </CardTitle>
          <CardDescription className="text-amber-700/80">
            Members cannot see this group or create new posts. All existing posts
            and events remain accessible via direct link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleToggle}
            disabled={loading}
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Unarchiving…</>
              : <><ArchiveRestore className="h-4 w-4 mr-2" />Unarchive group</>}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Danger zone
        </CardTitle>
        <CardDescription>
          Archiving this group hides it from all members and prevents any new posts.
          Existing content is preserved and the action is reversible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={handleToggle}
          disabled={loading}
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Archiving…</>
            : <><Archive className="h-4 w-4 mr-2" />Archive this group</>}
        </Button>
      </CardContent>
    </Card>
  )
}
