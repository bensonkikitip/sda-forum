'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Group = { id: string; name: string }

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function NewForumForm({ groups }: { groups: Group[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('💬')
  const [color, setColor] = useState('#3b82f6')
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => { setSlug(slugify(name)) }, [name])

  function toggleGroup(id: string) {
    setSelectedGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()

    const { data: forum, error } = await supabase
      .from('forums')
      .insert({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        icon: icon.trim() || null,
        color: color || null,
      })
      .select('id')
      .single()

    if (error || !forum) {
      toast.error(error?.message ?? 'Failed to create group')
      setSaving(false)
      return
    }

    if (selectedGroups.size > 0) {
      const rows = [...selectedGroups].map(gid => ({ forum_id: forum.id, group_id: gid }))
      const { error: fgError } = await supabase.from('forum_groups').insert(rows)
      if (fgError) toast.error('Group created but audience visibility failed: ' + fgError.message)
    }

    toast.success(`Group "${name}" created!`)
    router.push('/admin/forums')
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group name *</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. General Discussion"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL slug *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="general-discussion"
                required
              />
              <p className="text-xs text-muted-foreground">/forums/{slug || '…'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this group about?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon (emoji)</Label>
              <Input id="icon" value={icon} onChange={e => setIcon(e.target.value)} maxLength={4} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Accent color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" id="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-14 rounded border cursor-pointer" />
                <Input value={color} onChange={e => setColor(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Audiences</Label>
            {groups.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No audiences yet — group will be visible to all members.{' '}
                <a href="/admin/groups" className="underline">Create an audience first.</a>
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Select audiences that can see this group. Leave all unchecked = visible to everyone.
                </p>
                <div className="space-y-2 pt-1">
                  {groups.map(g => (
                    <div key={g.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`g-${g.id}`}
                        checked={selectedGroups.has(g.id)}
                        onCheckedChange={() => toggleGroup(g.id)}
                      />
                      <Label htmlFor={`g-${g.id}`} className="cursor-pointer font-normal">{g.name}</Label>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={saving || !name.trim() || !slug.trim()}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</> : 'Create group'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/admin/forums')}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
