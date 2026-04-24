'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { MessageSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  targetUserId: string
}

export function StartDmButton({ targetUserId }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClick() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('You must be logged in'); setLoading(false); return }

    // Look for an existing thread between these two users
    const { data: existing } = await supabase
      .from('direct_message_threads')
      .select('id')
      .or(`and(user_a.eq.${user.id},user_b.eq.${targetUserId}),and(user_a.eq.${targetUserId},user_b.eq.${user.id})`)
      .maybeSingle()

    if (existing) {
      router.push(`/inbox/${existing.id}`)
      return
    }

    // Create new thread
    const { data: thread, error } = await supabase
      .from('direct_message_threads')
      .insert({ user_a: user.id, user_b: targetUserId })
      .select('id')
      .single()

    if (error) {
      toast.error(error.code === '23505'
        ? 'A conversation already exists with this user'
        : error.message)
      setLoading(false)
      return
    }

    router.push(`/inbox/${thread.id}`)
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
      Message
    </Button>
  )
}
