'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminNav } from '@/components/admin-nav'

type Forum = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function AdminForumsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [forums, setForums] = useState<Forum[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('💬')
  const [color, setColor] = useState('#3b82f6')

  const loadForums = useCallback(async () => {
    const { data } = await supabase.from('forums').select('*').order('created_at')
    setForums(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadForums() }, [loadForums])

  // Auto-generate slug from name
  useEffect(() => { setSlug(slugify(name)) }, [name])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from('forums').insert({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      icon: icon.trim() || null,
      color: color || null,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Forum "${name}" created!`)
      setName('')
      setDescription('')
      setIcon('💬')
      setColor('#3b82f6')
      loadForums()
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-bold">Manage Forums</h1>
        <p className="text-muted-foreground text-sm mt-1">Create the forums users can browse and post in.</p>
      </div>

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Forum
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Forum name *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. General Discussion" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL slug *</Label>
                <Input id="slug" value={slug} onChange={e => setSlug(e.target.value)} placeholder="general-discussion" required />
                <p className="text-xs text-muted-foreground">/forums/{slug || '…'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this forum about?" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon (emoji)</Label>
                <Input id="icon" value={icon} onChange={e => setIcon(e.target.value)} placeholder="💬" maxLength={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Accent color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" id="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-14 rounded border cursor-pointer" />
                  <Input value={color} onChange={e => setColor(e.target.value)} className="font-mono text-sm" />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={saving || !name || !slug}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</> : 'Create forum'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing forums */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Existing forums ({forums.length})
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : forums.length === 0 ? (
          <p className="text-sm text-muted-foreground">No forums yet. Create one above.</p>
        ) : (
          <div className="space-y-2">
            {forums.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <span className="text-2xl">{f.icon ?? '💬'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{f.description ?? 'No description'}</p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs shrink-0">/forums/{f.slug}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
      <Separator />
    </div>
  )
}
