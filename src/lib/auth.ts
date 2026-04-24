import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Returns the current user or redirects to /login
export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if banned (maybeSingle so missing profile doesn't error)
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_banned')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.is_banned) {
    await supabase.auth.signOut()
    redirect('/login?reason=banned')
  }

  return user
}

// Returns the user's role — uses service role to bypass RLS so it always works
export async function getUserRole(userId: string): Promise<string> {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.role ?? 'user'
}

// Requires the user to be an admin, otherwise redirects to /home
export async function requireAdmin() {
  const user = await requireUser()
  const role = await getUserRole(user.id)
  if (role !== 'admin') redirect('/home')
  return user
}

// Requires admin or moderator
export async function requireModerator() {
  const user = await requireUser()
  const role = await getUserRole(user.id)
  if (role !== 'admin' && role !== 'moderator') redirect('/home')
  return user
}
