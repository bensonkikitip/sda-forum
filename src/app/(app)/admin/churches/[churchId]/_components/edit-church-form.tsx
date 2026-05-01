'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  churchId: string
  initialName: string
  initialCountry: string | null
}

export function EditChurchForm({ churchId, initialName, initialCountry }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [country, setCountry] = useState(initialCountry ?? '')
  const [loading, setLoading] = useState(false)

  const dirty = name.trim() !== initialName || (country.trim() || null) !== initialCountry

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !dirty) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('churches')
      .update({ name: name.trim(), country: country.trim() || null })
      .eq('id', churchId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Church updated.')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-country">Country</Label>
            <Input
              id="edit-country"
              value={country}
              onChange={e => setCountry(e.target.value)}
              disabled={loading}
              placeholder="e.g. United States"
            />
          </div>
          <Button type="submit" disabled={loading || !name.trim() || !dirty} size="sm" className="gap-1.5">
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
              : <><Save className="h-4 w-4" />Save changes</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
