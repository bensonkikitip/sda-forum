import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { DmComposer } from '@/components/dm-composer'

export const dynamic = 'force-dynamic'

export default async function DmThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const me = await requireUser()
  const supabase = await createClient()

  // Fetch the thread (RLS ensures we're a participant)
  const { data: thread } = await supabase
    .from('direct_message_threads')
    .select('id, user_a, user_b')
    .eq('id', threadId)
    .maybeSingle()

  if (!thread) notFound()
  if (me.id !== thread.user_a && me.id !== thread.user_b) redirect('/inbox')

  const otherId = thread.user_a === me.id ? thread.user_b : thread.user_a

  const [messagesResult, otherResult] = await Promise.all([
    supabase
      .from('dm_messages')
      .select('id, sender_id, body, read_at, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', otherId)
      .maybeSingle(),
  ])

  const messages = messagesResult.data ?? []
  const other = otherResult.data

  // Mark messages from the other person as read
  const unreadIds = messages
    .filter(m => m.sender_id !== me.id && !m.read_at)
    .map(m => m.id)
  if (unreadIds.length > 0) {
    await supabase
      .from('dm_messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
  }

  const otherInitials = other?.display_name?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/inbox" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <Avatar className="h-8 w-8">
          <AvatarImage src={other?.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">{otherInitials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm">{other?.display_name ?? 'Unknown'}</p>
        </div>
        <Link href={`/profile/${otherId}`} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
          View profile →
        </Link>
      </div>

      {/* Message list */}
      <div className="space-y-3 min-h-[200px]">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Say hello!</p>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === me.id
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMe
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted rounded-bl-sm'
                }`}>
                  <p>{msg.body}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <DmComposer threadId={threadId} />
    </div>
  )
}
