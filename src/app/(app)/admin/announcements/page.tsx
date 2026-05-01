'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Megaphone, Loader2, Plus, Trash2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, format, isPast } from 'date-fns'
import { AdminNav } from '@/components/admin-nav'

type Announcement = {
  id: string
  title: string
  body_md: string
  expires_at: string | null
  created_at: string
}

export default function AdminAnnouncementsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [expiresAt, setExpiresAt] = useState('')   // datetime-local string

  const loadAnnouncements = useCallback(async () => {
    const { data } = await supabase
      .from('announcements')
      .select('id, title, body_md, expires_at, created_at')
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
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Announcement sent! All members will receive it in their inbox.')
      setTitle('')
      setBody('')
      setExpiresAt('')
      loadAnnouncements()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const { error } = await supabase.from('announcements').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Announcement removed.')
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    }
    setDeletingId(null)
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
            <div className="space-y-2">
              <Label htmlFor="expires" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Expires at
                <span className="text-muted-foreground font-normal">(optional — leave blank to keep indefinitely)</span>
              </Label>
              <Input
                id="expires"
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
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
            {announcements.map(a => {
              const expired = a.expires_at ? isPast(new Date(a.expires_at)) : false
              return (
                <div
                  key={a.id}
                  className={`p-4 rounded-lg border space-y-1 ${expired ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold">{a.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{a.body_md}</p>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span>Sent {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                        {a.expires_at && (
                          <span className={`flex items-center gap-1 ${expired ? 'text-destructive' : ''}`}>
                            <Clock className="h-3 w-3" />
                            {expired
                              ? `Expired ${formatDistanceToNow(new Date(a.expires_at), { addSuffix: true })}`
                              : `Expires ${format(new Date(a.expires_at), 'MMM d, yyyy h:mm a')}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      disabled={deletingId === a.id}
                      onClick={() => handleDelete(a.id)}
                      title="Remove announcement"
                    >
                      {deletingId === a.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
