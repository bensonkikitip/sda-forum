'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { ChevronLeft, ImagePlus, Loader2, X, CalendarDays, Tag } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MAX_POST_IMAGE_BYTES, ALLOWED_IMAGE_TYPES } from '@/lib/constants'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Topic = {
  id: string
  name: string
  icon: string | null
  color: string | null
}

type Props = {
  forumId: string
  topics: Topic[]
}

export function NewPostForm({ forumId, topics }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set())

  // Event fields
  const [isEvent, setIsEvent] = useState(false)
  const [eventStart, setEventStart] = useState('')
  const [eventEnd, setEventEnd] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventLocationUrl, setEventLocationUrl] = useState('')

  function toggleTopic(id: string) {
    setSelectedTopicIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleImageAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter(f => {
      if (!ALLOWED_IMAGE_TYPES.includes(f.type)) { toast.error(`${f.name}: unsupported file type`); return false }
      if (f.size > MAX_POST_IMAGE_BYTES) { toast.error(`${f.name}: exceeds 5 MB limit`); return false }
      return true
    })
    setImages(prev => [...prev, ...valid].slice(0, 5))
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    if (isEvent && !eventStart) {
      toast.error('Please provide an event start date/time')
      return
    }
    if (isEvent && eventEnd && eventStart && new Date(eventEnd) <= new Date(eventStart)) {
      toast.error('Event end time must be after the start time')
      return
    }

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Single RPC call: inserts post + topics + fans out notifications atomically.
    const { data: newPostId, error: rpcError } = await supabase.rpc(
      'create_post_with_topics',
      {
        p_forum_id:           forumId,
        p_title:              title.trim(),
        p_body_md:            body.trim(),
        p_event_starts_at:    isEvent && eventStart ? new Date(eventStart).toISOString() : null,
        p_event_ends_at:      isEvent && eventEnd   ? new Date(eventEnd).toISOString()   : null,
        p_event_location:     isEvent ? eventLocation.trim() || null : null,
        p_event_location_url: isEvent ? eventLocationUrl.trim() || null : null,
        p_topic_ids:          selectedTopicIds.size > 0 ? [...selectedTopicIds] : null,
      }
    )

    if (rpcError || !newPostId) {
      toast.error(rpcError?.message ?? 'Failed to create post')
      setSaving(false)
      return
    }

    // Upload images (still done client-side after the post is created)
    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      const ext = file.name.split('.').pop()
      const path = `${newPostId}/${i}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('post-images').upload(path, file)
      if (uploadErr) { toast.error(`Image upload failed: ${uploadErr.message}`); continue }
      await supabase.from('post_images').insert({ post_id: newPostId, storage_path: path, position: i })
    }

    toast.success('Post created!')
    router.push(`/posts/${newPostId}`)
    router.refresh()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href={`/forums/${forumId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to group
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New post</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="What's on your mind?"
                required
              />
            </div>

            {/* Topic chips */}
            {topics.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Topics
                </Label>
                <div className="flex flex-wrap gap-2">
                  {topics.map(t => {
                    const selected = selectedTopicIds.has(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTopic(t.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-all"
                        style={selected ? {
                          backgroundColor: t.color ? `${t.color}20` : undefined,
                          borderColor: t.color ?? undefined,
                          color: t.color ?? undefined,
                        } : undefined}
                      >
                        {t.icon && <span>{t.icon}</span>}
                        {t.name}
                        {selected && <span className="text-xs">✓</span>}
                      </button>
                    )
                  })}
                </div>
                {selectedTopicIds.size === 0 && (
                  <p className="text-xs text-muted-foreground">No topic selected — all subscribers will be notified (once notification preferences are set up).</p>
                )}
              </div>
            )}

            {/* Event toggle */}
            <div className="rounded-md border p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <div>
                    <Label htmlFor="event-toggle" className="cursor-pointer">
                      This is an event
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Show this post with a date, time, and location.
                    </p>
                  </div>
                </div>
                <Switch
                  id="event-toggle"
                  checked={isEvent}
                  onCheckedChange={setIsEvent}
                />
              </div>

              {isEvent && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-2">
                    <Label htmlFor="event-start">Starts *</Label>
                    <Input
                      id="event-start"
                      type="datetime-local"
                      value={eventStart}
                      onChange={e => setEventStart(e.target.value)}
                      required={isEvent}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-end">Ends (optional)</Label>
                    <Input
                      id="event-end"
                      type="datetime-local"
                      value={eventEnd}
                      onChange={e => setEventEnd(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="event-location">Location (optional)</Label>
                    <Input
                      id="event-location"
                      value={eventLocation}
                      onChange={e => setEventLocation(e.target.value)}
                      placeholder="Fellowship Hall, 123 Main St"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="event-location-url">Location link (optional)</Label>
                    <Input
                      id="event-location-url"
                      type="url"
                      value={eventLocationUrl}
                      onChange={e => setEventLocationUrl(e.target.value)}
                      placeholder="https://maps.google.com/…"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Body</Label>
              <Tabs defaultValue="write">
                <TabsList className="mb-2">
                  <TabsTrigger value="write">Write</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="write">
                  <Textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Write your post here… Markdown is supported."
                    rows={10}
                    className="font-mono text-sm resize-y"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports **bold**, *italic*, [links](url), and more.
                  </p>
                </TabsContent>
                <TabsContent value="preview">
                  <div className="min-h-[200px] rounded-md border p-4 prose prose-sm max-w-none dark:prose-invert">
                    {body ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground italic">Nothing to preview yet.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <Label>Images (up to 5)</Label>
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={URL.createObjectURL(img)}
                      alt={img.name}
                      className="h-20 w-20 object-cover rounded-md border"
                    />
                    <button
                      type="button"
                      onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <label className="h-20 w-20 border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-foreground/40 transition-colors text-muted-foreground hover:text-foreground">
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[10px] mt-1">Add image</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      className="hidden"
                      onChange={handleImageAdd}
                    />
                  </label>
                )}
              </div>
            </div>

            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Publishing…</> : 'Publish post'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
