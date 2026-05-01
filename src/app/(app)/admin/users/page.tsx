import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { UserManagementTable } from './_components/user-management-table'
import { AdminNav } from '@/components/admin-nav'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  await requireAdmin()
  const supabase = createAdminClient()

  // Use admin client to see all profiles (including banned users)
  const [profilesResult, rolesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, is_banned, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('user_roles')
      .select('user_id, role'),
  ])

  const profiles = profilesResult.data ?? []
  const roleMap = Object.fromEntries((rolesResult.data ?? []).map(r => [r.user_id, r.role]))

  const users = profiles.map(p => ({
    ...p,
    role: (roleMap[p.id] ?? 'user') as 'user' | 'moderator' | 'admin',
  }))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ban members and assign pastor roles.
        </p>
      </div>
      <UserManagementTable initialUsers={users} />
    </div>
  )
}
