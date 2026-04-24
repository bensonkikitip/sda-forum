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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Loader2, Globe, Lock } from 'lucide-react'
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

type Group = { id: string; name: string }

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function AdminForumsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [forums, setForums] = useState<Forum[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  // Map of forum_id → Set of group_ids that can see it
  const [forumGroupMap, setForumGroupMap] = useState<Record<string, Set<string>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // New forum form
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('💬')
  const [color, setColor] = useState('#3b82f6')
  // Selected groups for the new forum (empty = visible to all)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    const [forumsRes, groupsRes, forumGroupsRes] = await Promise.all([
      supabase.from('forums').select('*').order('created_at'),
      supabase.from('groups').select('id, name').order('name'),
      supabase.from('forum_groups').select('forum_id, group_id'),
    ])
    setForums(forumsRes.data ?? [])
    setGroups(groupsRes.data ?? [])

    // Build forum → group set map
    const map: Record<string, Set<string>> = {}
    for (const row of forumGroupsRes.data ?? []) {
      if (!map[row.forum_id]) map[row.forum_id] = new Set()
      map[row.forum_id].add(row.group_id)
    }
    setForumGroupMap(map)
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { setSlug(slugify(name)) }, [name])

  function toggleGroup(groupId: string) {
    setSelectedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

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
      toast.error(error?.message ?? 'Failed to create forum')
      setSaving(false)
      return
    }

    // Insert group visibility rows if any groups were selected
    if (selectedGroups.size > 0) {
      const rows = [...selectedGroups].map(gid => ({ forum_id: forum.id, group_id: gid }))
      const { error: fgError } = await supabase.from('forum_groups').insert(rows)
      if (fgError) toast.error('Forum created but group visibility failed: ' + fgError.message)
    }

    toast.success(`Forum "${name}" created!`)
    setName('')
    setDescription('')
    setIcon('💬')
    setColor('#3b82f6')
    setSelectedGroups(new Set())
    loadData()
    router.refresh()
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-bold">Manage Forums</h1>
        <p className="text-muted-foreground text-sm mt-1">Create forums and control which groups can see them.</p>
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

            {/* Group visibility */}
            <div className="space-y-2">
              <Label>Visibility</Label>
              {groups.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No groups yet — forum will be visible to all members.{' '}
                  <a href="/admin/groups" className="underline">Create a group first.</a>
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select groups that can see this forum. Leave all unchecked for everyone.
                  </p>
                  <div className="space-y-2">
                    {groups.map(g => (
                      <div key={g.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`new-group-${g.id}`}
                          checked={selectedGroups.has(g.id)}
                          onCheckedChange={() => toggleGroup(g.id)}
                        />
                        <Label htmlFor={`new-group-${g.id}`} className="cursor-pointer font-normal">{g.name}</Label>
                      </div>
                    ))}
                  </div>
                </>
              )}
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
            {forums.map(f => {
              const groupIds = forumGroupMap[f.id]
              const restricted = groupIds && groupIds.size > 0
              const groupNames = restricted
                ? groups.filter(g => groupIds.has(g.id)).map(g => g.name)
                : []
              return (
                <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <span className="text-2xl mt-0.5">{f.icon ?? '💬'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{f.description ?? 'No description'}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {restricted ? (
                        <>
                          <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                          {groupNames.map(n => (
                            <Badge key={n} variant="outline" className="text-[10px] py-0">{n}</Badge>
                          ))}
                        </>
                      ) : (
                        <>
                          <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground">All members</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs shrink-0 mt-0.5">{f.slug}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <Separator />
    </div>
  )
}
