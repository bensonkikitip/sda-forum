'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

export function CreateChurchForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [country, setCountry] = useState('United States')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('churches')
      .insert({ name: name.trim(), country: country.trim() || null })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`"${name.trim()}" added.`)
      setName('')
      setCountry('United States')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Add a church</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor="church-name" className="sr-only">Church name</Label>
            <Input
              id="church-name"
              placeholder="Church name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="sm:w-44 space-y-1">
            <Label htmlFor="church-country" className="sr-only">Country</Label>
            <Input
              id="church-country"
              placeholder="Country"
              value={country}
              onChange={e => setCountry(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading || !name.trim()} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
