'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function DeleteTopicButton({ topicId, topicName }: { topicId: string; topicName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete topic "${topicName}"? Posts tagged with this topic will lose the tag.`)) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('topics').delete().eq('id', topicId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Topic "${topicName}" deleted`)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </Button>
  )
}
