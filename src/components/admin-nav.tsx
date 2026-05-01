import Link from 'next/link'
import { LayoutList, Users, Flag, Megaphone, Layers, Tag, CalendarDays, Map, Church } from 'lucide-react'

const links = [
  { href: '/admin/forums',        label: 'Groups',        icon: LayoutList },
  { href: '/admin/regions',       label: 'Regions',       icon: Map },
  { href: '/admin/groups',        label: 'Audiences',     icon: Layers },
  { href: '/admin/churches',      label: 'Churches',      icon: Church },
  { href: '/admin/topics',        label: 'Topics',        icon: Tag },
  { href: '/admin/reports',       label: 'Reports',       icon: Flag },
  { href: '/admin/users',         label: 'Users',         icon: Users },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/digest',        label: 'Digest',        icon: CalendarDays },
]

export function AdminNav() {
  return (
    <nav className="flex gap-1 flex-wrap mb-6 border-b pb-4">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
