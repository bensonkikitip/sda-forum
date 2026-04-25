'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function CreateTopicForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState('#003E7E')
  const [saving, setSaving] = useState(false)

  // Auto-generate a slug from the name (lowercase, hyphens)
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!slug) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('topics')
      .insert({ name: name.trim(), slug, icon: icon.trim() || null, color: color || null })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Topic "${name}" created`)
      setName('')
      setIcon('')
      setColor('#003E7E')
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Topic
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="topic-name">Name *</Label>
              <Input
                id="topic-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Youth"
                required
              />
              {slug && (
                <p className="text-xs text-muted-foreground">Slug: <code>{slug}</code></p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-icon">Icon (emoji)</Label>
              <Input
                id="topic-icon"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                placeholder="🌟"
                maxLength={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-color">Colour</Label>
              <div className="flex items-center gap-2">
                <input
                  id="topic-color"
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer p-1"
                />
                <Input
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  placeholder="#003E7E"
                  className="font-mono"
                />
              </div>
            </div>
          </div>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</> : 'Create topic'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
