'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Flag, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  targetType: 'post' | 'comment'
  targetId: string
  alreadyReported?: boolean
}

export function ReportButton({ targetType, targetId, alreadyReported }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  if (alreadyReported) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Flag className="h-3 w-3" /> Reported
      </span>
    )
  }

  async function handleReport() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('You must be logged in'); setSaving(false); return }

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason: reason.trim() || null,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Report submitted. An admin will review it.')
      setOpen(false)
      setReason('')
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
      >
        <Flag className="h-3 w-3" /> Report
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {targetType}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Tell us why you think this {targetType} violates community guidelines.
            </p>
            <Textarea
              placeholder="Optional: describe the issue…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReport} disabled={saving}>
              {saving ? <><Loader2 className="h-3 w-3 animate-spin mr-2" />Sending…</> : 'Submit report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
