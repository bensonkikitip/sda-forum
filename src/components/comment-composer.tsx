'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  postId: string
  isLocked: boolean
}

export function CommentComposer({ postId, isLocked }: Props) {
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  if (isLocked) {
    return (
      <p className="text-sm text-muted-foreground italic">
        This post is locked — no new comments can be added.
      </p>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('You must be logged in'); setSaving(false); return }

    const { error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: user.id, body_md: body.trim() })

    if (error) {
      toast.error(error.message)
    } else {
      setBody('')
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Write a comment… Markdown supported."
        rows={4}
        className="font-mono text-sm resize-y"
      />
      <Button type="submit" size="sm" disabled={saving || !body.trim()}>
        {saving ? <><Loader2 className="h-3 w-3 animate-spin mr-2" />Posting…</> : 'Post comment'}
      </Button>
    </form>
  )
}
