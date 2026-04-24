'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Megaphone, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { AdminNav } from '@/components/admin-nav'

type Announcement = {
  id: string
  title: string
  body_md: string
  created_at: string
}

export default function AdminAnnouncementsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const loadAnnouncements = useCallback(async () => {
    const { data } = await supabase
      .from('announcements')
      .select('id, title, body_md, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    setAnnouncements(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadAnnouncements() }, [loadAnnouncements])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not logged in'); setSaving(false); return }

    const { error } = await supabase.from('announcements').insert({
      author_id: user.id,
      title: title.trim(),
      body_md: body.trim(),
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Announcement sent! All members will receive it in their inbox.')
      setTitle('')
      setBody('')
      loadAnnouncements()
    }
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send a message to all members&apos; inboxes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> New announcement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Community Guidelines Update"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message *</Label>
              <Textarea
                id="body"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your announcement here…"
                rows={5}
                required
              />
            </div>
            <Button type="submit" disabled={saving || !title || !body}>
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending…</>
                : <><Megaphone className="h-4 w-4 mr-2" />Send to all members</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Past announcements ({announcements.length})
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map(a => (
              <div key={a.id} className="p-4 rounded-lg border space-y-1">
                <p className="font-semibold">{a.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{a.body_md}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
