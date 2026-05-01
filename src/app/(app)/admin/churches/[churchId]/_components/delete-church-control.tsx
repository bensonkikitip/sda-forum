'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2, AlertTriangle, Users } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  churchId: string
  churchName: string
  memberCount: number
}

export function DeleteChurchControl({ churchId, churchName, memberCount }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('churches')
      .delete()
      .eq('id', churchId)
    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success(`"${churchName}" deleted.`)
      router.push('/admin/churches')
    }
  }

  if (memberCount > 0) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-amber-800">
            <Users className="h-4 w-4" />
            Cannot delete — church has members
          </CardTitle>
          <CardDescription className="text-amber-700/80">
            {memberCount} {memberCount === 1 ? 'member belongs' : 'members belong'} to this church.
            Reassign them to another church before deleting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled className="border-amber-300 text-amber-800">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete this church
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Danger zone
        </CardTitle>
        <CardDescription>
          Permanently deletes this church. This cannot be undone. Only possible when no members belong to it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting…</>
            : <><Trash2 className="h-4 w-4 mr-2" />Delete this church</>}
        </Button>
      </CardContent>
    </Card>
  )
}
