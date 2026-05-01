import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth'
import { SignOutButton } from '@/components/sign-out-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, Shield, Home, Settings, Bell } from 'lucide-react'

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
    <>
      {/* ── Top header ───────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 w-full border-b border-white/15 backdrop-blur-sm"
        style={{ backgroundColor: 'var(--primary)' }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Left: logo + main nav */}
          <div className="flex items-center gap-6">
            <Link href="/home" className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15">
                <span className="text-white font-black text-sm leading-none">✝</span>
              </div>
              <span className="font-black text-white text-xl tracking-tight leading-tight">
                SDA Community
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1">
              {isModOrAdmin && (
                <Link
                  href="/admin/forums"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors font-medium"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
            </nav>
          </div>

          {/* Right: inbox + settings + avatar */}
          <div className="flex items-center gap-1">
            {/* Inbox / notifications */}
            <Link
              href="/inbox"
              className="relative p-2.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-accent text-[10px] font-black text-accent-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Settings */}
            <Link
              href="/settings"
              className="p-2.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>

            {/* Avatar + name */}
            <Link
              href={`/profile/${user.id}`}
              className="flex items-center gap-2 ml-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Avatar className="h-8 w-8 ring-2 ring-white/30">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs font-bold bg-white/20 text-white">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm font-semibold text-white">
                {profile?.display_name ?? user.email}
              </span>
            </Link>

            <SignOutButton />
          </div>
        </div>
      </header>

      {/* ── Mobile bottom nav (fixed, only on small screens) ─────── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-border/50 backdrop-blur-md"
        style={{ backgroundColor: 'color-mix(in oklch, var(--primary) 97%, transparent)' }}
      >
        <Link
          href="/home"
          className="flex-1 flex flex-col items-center py-3 text-[11px] font-semibold text-white/70 hover:text-white transition-colors gap-0.5"
        >
          <Home className="h-5 w-5" />
          Home
        </Link>
        <Link
          href="/inbox"
          className="flex-1 flex flex-col items-center py-3 text-[11px] font-semibold text-white/70 hover:text-white transition-colors gap-0.5 relative"
        >
          <Bell className="h-5 w-5" />
          Inbox
          {unreadCount > 0 && (
            <span className="absolute top-2 right-[calc(50%-14px)] h-3.5 w-3.5 bg-accent rounded-full text-[8px] text-accent-foreground flex items-center justify-center font-black">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
        {isModOrAdmin && (
          <Link
            href="/admin/forums"
            className="flex-1 flex flex-col items-center py-3 text-[11px] font-semibold text-white/70 hover:text-white transition-colors gap-0.5"
          >
            <Shield className="h-5 w-5" />
            Admin
          </Link>
        )}
        <Link
          href="/settings"
          className="flex-1 flex flex-col items-center py-3 text-[11px] font-semibold text-white/70 hover:text-white transition-colors gap-0.5"
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </nav>
    </>
  )
}
