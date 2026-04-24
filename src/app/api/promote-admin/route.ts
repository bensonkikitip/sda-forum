import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Called on first load after sign-in. If the logged-in user's email matches
// ADMIN_EMAIL and they have no role yet, this promotes them to admin.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ ok: true })
  }

  // Use service role to bypass RLS for this write
  const adminClient = createAdminClient()

  const { data: existing } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    await adminClient
      .from('user_roles')
      .insert({ user_id: user.id, role: 'admin' })
  }

  return NextResponse.json({ ok: true })
}
