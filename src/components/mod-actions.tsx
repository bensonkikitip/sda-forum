'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Pin, Lock, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  postId: string
  forumId: string
  isPinned: boolean
  isLocked: boolean
  isRemoved: boolean
}

export function ModActions({ postId, forumId, isPinned, isLocked, isRemoved }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function update(patch: Record<string, boolean>, label: string) {
    setLoading(label)
    const supabase = createClient()
    const { error } = await supabase.from('posts').update(patch).eq('id', postId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Post ${label}`)
      // After removing a post, redirect to the forum — the post page would 404
      if (patch.is_removed) {
        router.push(`/forums/${forumId}`)
      } else {
        router.refresh()
      }
    }
    setLoading(null)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Mod:</span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => update({ is_pinned: !isPinned }, isPinned ? 'unpinned' : 'pinned')}
        disabled={!!loading}
      >
        {loading === 'pinned' || loading === 'unpinned'
          ? <Loader2 className="h-3 w-3 animate-spin" />
          : <Pin className="h-3 w-3" />}
        {isPinned ? 'Unpin' : 'Pin'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => update({ is_locked: !isLocked }, isLocked ? 'unlocked' : 'locked')}
        disabled={!!loading}
      >
        {loading === 'locked' || loading === 'unlocked'
          ? <Loader2 className="h-3 w-3 animate-spin" />
          : <Lock className="h-3 w-3" />}
        {isLocked ? 'Unlock' : 'Lock'}
      </Button>
      {!isRemoved && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => update({ is_removed: true }, 'removed')}
          disabled={!!loading}
        >
          {loading === 'removed' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          Remove
        </Button>
      )}
    </div>
  )
}
