'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  forumId: string
  isSubscribed: boolean
}

export function SubscribeButton({ forumId, isSubscribed: initial }: Props) {
  const [subscribed, setSubscribed] = useState(initial)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    if (subscribed) {
      const { error } = await supabase
        .from('forum_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('forum_id', forumId)
      if (error) {
        toast.error('Could not unsubscribe')
      } else {
        setSubscribed(false)
        toast.success('Unsubscribed from this group')
      }
    } else {
      const { error } = await supabase
        .from('forum_subscriptions')
        .insert({ user_id: user.id, forum_id: forumId })
      if (error) {
        toast.error('Could not subscribe')
      } else {
        setSubscribed(true)
        toast.success('Subscribed — you\'ll be notified of new posts')
      }
    }
    setLoading(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={
        subscribed
          ? 'gap-1.5 bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white'
          : 'gap-1.5 bg-transparent border-white/40 text-white hover:bg-white/20 hover:text-white'
      }
    >
      {subscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {subscribed ? 'Subscribed' : 'Subscribe'}
    </Button>
  )
}
