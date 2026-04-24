'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldCheck, ShieldOff, Ban, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

type User = {
  id: string
  display_name: string
  avatar_url: string | null
  is_banned: boolean
  created_at: string
  role: 'user' | 'moderator' | 'admin'
}

interface Props {
  initialUsers: User[]
}

export function UserManagementTable({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function handleBan(userId: string, isBanned: boolean) {
    setLoading(`ban-${userId}`)
    const supabase = createClient()

    let error
    if (isBanned) {
      // Unban: delete from bans table (trigger will clear profiles.is_banned)
      const res = await supabase.from('bans').delete().eq('user_id', userId)
      error = res.error
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      error = (await supabase.from('bans').insert({
        user_id: userId,
        banned_by: user?.id,
        reason: 'Admin action',
      })).error
    }

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(isBanned ? 'User unbanned' : 'User banned')
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: !isBanned } : u))
      router.refresh()
    }
    setLoading(null)
  }

  async function handleRoleToggle(userId: string, currentRole: string) {
    setLoading(`role-${userId}`)
    const supabase = createClient()

    const newRole = currentRole === 'moderator' ? 'user' : 'moderator'
    let error

    if (newRole === 'user') {
      const res = await supabase.from('user_roles').delete().eq('user_id', userId)
      error = res.error
    } else {
      const res = await supabase.from('user_roles').upsert({ user_id: userId, role: newRole })
      error = res.error
    }

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Role updated to ${newRole}`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as 'user' | 'moderator' } : u))
    }
    setLoading(null)
  }

  return (
    <div className="space-y-2">
      {users.map(u => (
        <div key={u.id} className="flex items-center gap-3 p-4 rounded-lg border">
          <Link href={`/profile/${u.id}`}>
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={u.avatar_url ?? undefined} />
              <AvatarFallback className="text-sm">
                {u.display_name?.slice(0, 2).toUpperCase() ?? '??'}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/profile/${u.id}`} className="font-medium text-sm hover:underline">
                {u.display_name}
              </Link>
              {u.role !== 'user' && (
                <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                  {u.role}
                </Badge>
              )}
              {u.is_banned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Role toggle — don't allow demoting admins */}
            {u.role !== 'admin' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRoleToggle(u.id, u.role)}
                disabled={!!loading}
              >
                {loading === `role-${u.id}`
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : u.role === 'moderator'
                    ? <ShieldOff className="h-3 w-3" />
                    : <ShieldCheck className="h-3 w-3" />}
                {u.role === 'moderator' ? 'Remove mod' : 'Make mod'}
              </Button>
            )}

            {/* Ban/unban — don't allow banning admins */}
            {u.role !== 'admin' && (
              <Button
                size="sm"
                variant={u.is_banned ? 'outline' : 'destructive'}
                onClick={() => handleBan(u.id, u.is_banned)}
                disabled={!!loading}
              >
                {loading === `ban-${u.id}`
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : u.is_banned
                    ? <CheckCircle className="h-3 w-3" />
                    : <Ban className="h-3 w-3" />}
                {u.is_banned ? 'Unban' : 'Ban'}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
