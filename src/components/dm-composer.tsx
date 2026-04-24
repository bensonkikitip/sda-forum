'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  threadId: string
}

export function DmComposer({ threadId }: Props) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not logged in'); setSending(false); return }

    const { error } = await supabase.from('dm_messages').insert({
      thread_id: threadId,
      sender_id: user.id,
      body: body.trim(),
    })

    if (error) {
      toast.error(error.message)
    } else {
      setBody('')
      router.refresh()
    }
    setSending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 sticky bottom-4">
      <Input
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Type a message…"
        className="flex-1"
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
      />
      <Button type="submit" disabled={sending || !body.trim()} size="icon">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </form>
  )
}
