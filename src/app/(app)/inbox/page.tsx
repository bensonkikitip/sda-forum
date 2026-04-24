'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Bell, Inbox } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

type InboxMsg = {
  id: string
  kind: string
  title: string | null
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

type DmThread = {
  id: string
  last_message_at: string | null
  created_at: string
  other: { id: string; display_name: string; avatar_url: string | null } | null
}

export default function InboxPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [messages, setMessages] = useState<InboxMsg[]>([])
  const [threads, setThreads] = useState<DmThread[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [msgResult, threadResult] = await Promise.all([
        supabase
          .from('inbox_messages')
          .select('id, kind, title, body, link, read_at, created_at')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('direct_message_threads')
          .select('id, last_message_at, created_at, user_a, user_b')
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
          .order('last_message_at', { ascending: false, nullsFirst: false }),
      ])

      setMessages(msgResult.data ?? [])

      // Fetch the other user's profile for each thread
      const rawThreads = threadResult.data ?? []
      const otherIds = rawThreads.map(t => t.user_a === user.id ? t.user_b : t.user_a)
      const uniqueOtherIds = [...new Set(otherIds)]
      let profileMap: Record<string, { id: string; display_name: string; avatar_url: string | null }> = {}
      if (uniqueOtherIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', uniqueOtherIds)
        for (const p of profiles ?? []) profileMap[p.id] = p
      }

      setThreads(rawThreads.map(t => ({
        id: t.id,
        last_message_at: t.last_message_at,
        created_at: t.created_at,
        other: profileMap[t.user_a === user.id ? t.user_b : t.user_a] ?? null,
      })))
      setLoading(false)

      // Mark all unread inbox messages as read
      const unreadIds = (msgResult.data ?? []).filter(m => !m.read_at).map(m => m.id)
      if (unreadIds.length > 0) {
        await supabase
          .from('inbox_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds)
        router.refresh()
      }
    }
    load()
  }, [supabase, router])

  const unreadCount = messages.filter(m => !m.read_at).length

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Inbox className="h-6 w-6" /> Inbox
      </h1>

      <Tabs defaultValue="messages">
        <TabsList className="mb-4">
          <TabsTrigger value="messages" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
            {unreadCount > 0 && <Badge className="h-5 px-1.5 text-[10px]">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="dms" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Direct messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : messages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>No notifications yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg border transition-colors ${!msg.read_at ? 'bg-primary/5 border-primary/20' : 'bg-background'}`}
                >
                  {msg.title && <p className="font-medium text-sm">{msg.title}</p>}
                  {msg.body && <p className="text-sm text-muted-foreground mt-1">{msg.body}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                    {msg.link && (
                      <Link href={msg.link} className="text-xs text-primary hover:underline">
                        View →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dms">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : threads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>No conversations yet</p>
                <p className="text-sm mt-1">Visit someone&apos;s profile to start a DM.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {threads.map(thread => (
                <Link key={thread.id} href={`/inbox/${thread.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:border-foreground/20 hover:bg-muted/30 transition-all">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={thread.other?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-sm">
                        {thread.other?.display_name?.slice(0, 2).toUpperCase() ?? '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{thread.other?.display_name ?? 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {thread.last_message_at
                          ? formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })
                          : 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
