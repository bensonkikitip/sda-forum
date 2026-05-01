'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Map } from 'lucide-react'
import { toast } from 'sonner'

type Region = { id: string; name: string }

type Props = {
  churchId: string
  allRegions: Region[]
  currentRegionId: string | null
}

export function ChurchRegionPicker({ churchId, allRegions, currentRegionId }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState(currentRegionId ?? '')
  const [loading, setLoading] = useState(false)

  const dirty = (selected || null) !== currentRegionId

  async function handleSave() {
    if (!dirty) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('churches')
      .update({ region_id: selected || null })
      .eq('id', churchId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Region updated.')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Map className="h-4 w-4" /> Region
        </CardTitle>
        <CardDescription>
          Assigning a region enables members of this church to auto-subscribe to that region's forums.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-3">
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          disabled={loading}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">— No region —</option>
          {allRegions.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <Button
          onClick={handleSave}
          disabled={loading || !dirty}
          size="sm"
          className="shrink-0"
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
            : 'Save'}
        </Button>
      </CardContent>
    </Card>
  )
}
