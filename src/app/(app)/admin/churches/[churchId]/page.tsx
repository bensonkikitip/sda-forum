import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireModerator } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin-nav'
import { EditChurchForm } from './_components/edit-church-form'
import { ChurchRegionPicker } from './_components/church-region-picker'
import { DeleteChurchControl } from './_components/delete-church-control'

export const dynamic = 'force-dynamic'

export default async function ChurchDetailPage({
  params,
}: {
  params: Promise<{ churchId: string }>
}) {
  const { churchId } = await params
  await requireModerator()
  const admin = createAdminClient()

  const [churchResult, regionsResult, profileCountResult] = await Promise.all([
    admin
      .from('churches')
      .select('id, name, country, region_id, regions(id, name)')
      .eq('id', churchId)
      .maybeSingle(),
    admin.from('regions').select('id, name').order('name'),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId),
  ])

  if (!churchResult.data) notFound()

  const church = churchResult.data as {
    id: string
    name: string
    country: string | null
    region_id: string | null
    regions: { id: string; name: string } | { id: string; name: string }[] | null
  }

  const allRegions = (regionsResult.data ?? []) as { id: string; name: string }[]
  const memberCount = profileCountResult.count ?? 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <AdminNav />
      <div>
        <Link
          href="/admin/churches"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> All churches
        </Link>
        <h1 className="text-2xl font-bold">{church.name}</h1>
        {church.country && (
          <p className="text-muted-foreground text-sm mt-1">{church.country}</p>
        )}
      </div>

      <EditChurchForm
        churchId={church.id}
        initialName={church.name}
        initialCountry={church.country}
      />

      <ChurchRegionPicker
        churchId={church.id}
        allRegions={allRegions}
        currentRegionId={church.region_id}
      />

      <DeleteChurchControl
        churchId={church.id}
        churchName={church.name}
        memberCount={memberCount}
      />
    </div>
  )
}
