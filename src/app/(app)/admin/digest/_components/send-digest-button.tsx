'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { sendDigest } from '../_actions'

type Props = {
  scope: 'site' | 'forum'
  forumId?: string
  expectedEventIds: string[]
  expectedRecipientCount: number
}

export function SendDigestButton({
  scope,
  forumId,
  expectedEventIds,
  expectedRecipientCount,
}: Props) {
  const [open, setOpen]       = useState(false)
  const [sending, setSending] = useState(false)
  const router                = useRouter()

  async function handleConfirm() {
    setSending(true)
    const result = await sendDigest(scope, forumId, expectedEventIds, expectedRecipientCount)
    setSending(false)
    setOpen(false)

    if (result.ok) {
      toast.success(`Digest sent to ${expectedRecipientCount} member${expectedRecipientCount !== 1 ? 's' : ''}!`)
      router.push('/admin/digest')
    } else {
      toast.error(result.error)
      if (result.error.includes('Content changed')) {
        // Refresh the preview so the user gets up-to-date data
        router.refresh()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Send className="h-4 w-4" />
        Send digest
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send digest?</DialogTitle>
          <DialogDescription>
            This will deliver the digest to{' '}
            <strong>{expectedRecipientCount} member{expectedRecipientCount !== 1 ? 's' : ''}</strong>.
            Members who have opted into digest emails will also receive an email.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={sending} className="gap-2">
            {sending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
              : <>Send to {expectedRecipientCount} members</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
