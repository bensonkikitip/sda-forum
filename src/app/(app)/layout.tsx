import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check ban status
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_banned')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.is_banned) {
    await supabase.auth.signOut()
    redirect('/login?reason=banned')
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
      <main className="flex-1">{children}</main>
    </div>
  )
}
