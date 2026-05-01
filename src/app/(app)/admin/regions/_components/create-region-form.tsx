'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CreateRegionForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('regions')
      .insert({
        name: trimmed,
        slug: slugify(trimmed),
        description: description.trim() || null,
      })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Region "${trimmed}" created`)
      setName('')
      setDescription('')
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Region
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="region-name">Region name *</Label>
            <Input
              id="region-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Southeastern California Conference"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region-desc">Description</Label>
            <Textarea
              id="region-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional"
              rows={2}
            />
          </div>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</> : 'Create region'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
