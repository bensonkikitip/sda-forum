import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check ban status + onboarding completeness in one query
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, is_banned')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.is_banned) {
    await supabase.auth.signOut()
    redirect('/login?reason=banned')
  }

  // Guard: new users (display_name empty) must complete onboarding before
  // accessing any app page. The middleware injects x-pathname so we can
  // avoid an infinite redirect loop on the /onboarding page itself.
  const pathname = (await headers()).get('x-pathname') ?? ''
  if (!profile?.display_name && !pathname.startsWith('/onboarding')) {
    redirect('/onboarding')
  }

  // Auto-promote admin if email matches ADMIN_EMAIL and no role exists yet
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && user.email === adminEmail) {
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingRole) {
      const adminClient = createAdminClient()
      await adminClient
        .from('user_roles')
        .upsert({ user_id: user.id, role: 'admin' })
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {/* pb-16 sm:pb-0 reserves space for the fixed mobile bottom nav */}
      <main className="flex-1 pb-16 sm:pb-0">{children}</main>
    </div>
  )
}
