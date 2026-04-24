'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  forumId: string
  initialName: string
  initialDescription: string | null
}

export function ForumDetailsEditor({ forumId, initialName, initialDescription }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [saving, setSaving] = useState(false)

  const isDirty =
    name.trim() !== initialName.trim() ||
    description.trim() !== (initialDescription ?? '').trim()

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('forums')
      .update({
        name: name.trim(),
        description: description.trim() || null,
      })
      .eq('id', forumId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Forum updated')
      router.refresh()
    }
    setSaving(false)
  }

  function handleReset() {
    setName(initialName)
    setDescription(initialDescription ?? '')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Pencil className="h-4 w-4 text-primary" />
          Forum Details
        </CardTitle>
        <CardDescription>
          Edit the forum name and description. Changes are not saved until you click Save.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="forum-name">Name *</Label>
          <Input
            id="forum-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Forum name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="forum-description">Description</Label>
          <Textarea
            id="forum-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What is this forum about?"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={handleSave}
            disabled={saving || !isDirty || !name.trim()}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
            ) : (
              'Save changes'
            )}
          </Button>
          {isDirty && (
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              Discard
            </Button>
          )}
          {isDirty && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
