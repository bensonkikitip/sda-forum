import { requireModerator } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin-nav'
import { NewForumForm } from './_components/new-forum-form'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function NewForumPage() {
  await requireModerator()
  const admin = createAdminClient()

  const { data: groups } = await admin
    .from('groups')
    .select('id, name')
    .order('name')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <AdminNav />
      <div>
        <Link href="/admin/forums" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to groups
        </Link>
        <h1 className="text-2xl font-bold">New Group</h1>
      </div>
      <NewForumForm groups={groups ?? []} />
    </div>
  )
}
