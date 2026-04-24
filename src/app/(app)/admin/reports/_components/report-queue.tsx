'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Trash2, Loader2, FileText, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

type ReportRow = {
  id: string
  target_type: 'post' | 'comment'
  target_id: string
  reason: string | null
  created_at: string
  reporter: { display_name: string } | null
  content: string | null
  content_author: string | null
}

interface Props {
  reports: ReportRow[]
}

export function ReportQueue({ reports }: Props) {
  const [items, setItems] = useState(reports)
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function resolve(reportId: string, targetType: string, targetId: string, action: 'approved' | 'removed') {
    setLoading(reportId)
    const supabase = createClient()

    // Close the report
    const { error: reportErr } = await supabase
      .from('reports')
      .update({ status: action })
      .eq('id', reportId)

    if (reportErr) { toast.error(reportErr.message); setLoading(null); return }

    // If removing, also mark the content as removed
    if (action === 'removed') {
      const table = targetType === 'post' ? 'posts' : 'comments'
      const { error: contentErr } = await supabase
        .from(table)
        .update({ is_removed: true })
        .eq('id', targetId)
      if (contentErr) toast.error(`Content removal failed: ${contentErr.message}`)
    }

    toast.success(action === 'approved' ? 'Report dismissed — content kept' : 'Content removed')
    setItems(prev => prev.filter(r => r.id !== reportId))
    router.refresh()
    setLoading(null)
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">No open reports.</p>
  }

  return (
    <div className="space-y-4">
      {items.map(report => (
        <div key={report.id} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {report.target_type === 'post'
                ? <FileText className="h-4 w-4 text-muted-foreground" />
                : <MessageSquare className="h-4 w-4 text-muted-foreground" />}
              <Badge variant="outline" className="text-xs">
                {report.target_type}
              </Badge>
              <Link
                href={report.target_type === 'post' ? `/posts/${report.target_id}` : `/posts/${report.target_id}`}
                className="text-xs text-primary hover:underline"
              >
                View original →
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
            </p>
          </div>

          {/* Reported content preview */}
          <div className="rounded-md bg-muted/50 p-3 space-y-1">
            {report.content_author && (
              <p className="text-xs text-muted-foreground">by {report.content_author}</p>
            )}
            <p className="text-sm line-clamp-3">{report.content ?? '(content unavailable)'}</p>
          </div>

          {/* Reporter + reason */}
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Reported by: <span className="font-medium">{report.reporter?.display_name ?? 'Unknown'}</span></p>
            {report.reason && <p>Reason: {report.reason}</p>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => resolve(report.id, report.target_type, report.target_id, 'approved')}
              disabled={!!loading}
            >
              {loading === report.id
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <CheckCircle className="h-3 w-3" />}
              Keep content
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => resolve(report.id, report.target_type, report.target_id, 'removed')}
              disabled={!!loading}
            >
              {loading === report.id
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Trash2 className="h-3 w-3" />}
              Remove content
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
