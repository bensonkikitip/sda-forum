'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Church } from 'lucide-react'
import { toast } from 'sonner'

type ChurchRow = { id: string; name: string; region: string | null }

type Props = {
  regionId: string
  memberChurches: ChurchRow[]
}

export function RegionChurchesManager({ regionId, memberChurches: initial }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState<ChurchRow[]>(initial)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ChurchRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (search.length < 2) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      const supabase = createClient()
      // Search churches that are NOT already in this region.
      // (A church can only belong to one region — assigning it here moves it.)
      const { data } = await supabase
        .from('churches')
        .select('id, name, region, region_id')
        .ilike('name', `%${search}%`)
        .order('name')
        .limit(20)
      const memberIds = new Set(members.map(m => m.id))
      setResults(
        (data ?? [])
          .filter(c => !memberIds.has(c.id))
          .map(c => ({ id: c.id, name: c.name, region: c.region }))
      )
    }, 300)
    return () => clearTimeout(t)
  }, [search, members])

  async function addChurch(church: ChurchRow) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('churches')
      .update({ region_id: regionId })
      .eq('id', church.id)
    if (error) {
      toast.error(error.message)
    } else {
      setMembers(prev => [...prev, church])
      setSearch('')
      setResults([])
      toast.success(`${church.name} assigned to this region`)
      router.refresh()
    }
    setLoading(false)
  }

  async function removeChurch(churchId: string, churchName: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('churches')
      .update({ region_id: null })
      .eq('id', churchId)
    if (error) {
      toast.error(error.message)
    } else {
      setMembers(prev => prev.filter(m => m.id !== churchId))
      toast.success(`${churchName} removed from this region`)
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Member Churches</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="Search churches to assign…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={loading}
          />
          {results.length > 0 && (
            <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto shadow-sm">
              {results.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-0"
                  onClick={() => addChurch(c)}
                >
                  <span className="font-medium">{c.name}</span>
                  {c.region && <span className="text-muted-foreground ml-1">— {c.region}</span>}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Assigning a church here moves it to this region (each church belongs to one region).
          </p>
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No churches in this region yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <Badge key={m.id} variant="secondary" className="gap-1.5 pr-1">
                <Church className="h-3 w-3" />
                {m.name}
                {m.region && <span className="text-muted-foreground">· {m.region}</span>}
                <button
                  type="button"
                  onClick={() => removeChurch(m.id, m.name)}
                  className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                  aria-label={`Remove ${m.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
