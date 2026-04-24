import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth'
import { SignOutButton } from '@/components/sign-out-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Shield, Home, Settings } from 'lucide-react'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [role, profileResult, unreadResult] = await Promise.all([
    getUserRole(user.id),
    supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle(),
    supabase.from('inbox_messages').select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id).is('read_at', null),
  ])

  const profile = profileResult.data
  const unreadCount = unreadResult.count ?? 0
  const initials = profile?.display_name?.slice(0, 2).toUpperCase() ?? '??'
  const isModOrAdmin = role === 'admin' || role === 'moderator'

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Left: logo + main nav */}
        <div className="flex items-center gap-6">
          <Link href="/home" className="font-bold text-lg tracking-tight">
            SDA Forum
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/home" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-4 w-4" />
              Home
            </Link>
            {isModOrAdmin && (
              <Link href="/admin/forums" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>
        </div>

        {/* Right: inbox + avatar + sign out */}
        <div className="flex items-center gap-2">
          <Link href="/inbox" className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
            <MessageSquare className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Link>

          <Link href={`/profile/${user.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden md:inline text-sm font-medium">
              {profile?.display_name ?? user.email}
            </span>
          </Link>

          <Link href="/settings" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="h-5 w-5" />
          </Link>

          <SignOutButton />
        </div>
      </div>

      {/* Mobile bottom nav links */}
      <div className="sm:hidden flex border-t">
        <Link href="/home" className="flex-1 flex flex-col items-center py-2 text-xs text-muted-foreground hover:text-foreground">
          <Home className="h-4 w-4 mb-0.5" />
          Home
        </Link>
        <Link href="/inbox" className="flex-1 flex flex-col items-center py-2 text-xs text-muted-foreground hover:text-foreground relative">
          <MessageSquare className="h-4 w-4 mb-0.5" />
          Inbox
          {unreadCount > 0 && (
            <span className="absolute top-1 right-6 h-3 w-3 bg-primary rounded-full text-[8px] text-primary-foreground flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Link>
        <Link href="/settings" className="flex-1 flex flex-col items-center py-2 text-xs text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4 mb-0.5" />
          Settings
        </Link>
        {isModOrAdmin && (
          <Link href="/admin/reports" className="flex-1 flex flex-col items-center py-2 text-xs text-muted-foreground hover:text-foreground">
            <Shield className="h-4 w-4 mb-0.5" />
            Admin
          </Link>
        )}
      </div>
    </header>
  )
}
