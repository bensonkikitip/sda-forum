import { redirect } from 'next/navigation'
import { requireUser, getUserRole } from '@/lib/auth'

// Only admins and moderators can create posts
export default async function NewPostLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ forumId: string }>
}) {
  const { forumId } = await params
  const user = await requireUser()
  const role = await getUserRole(user.id)
  if (role !== 'admin' && role !== 'moderator') {
    redirect(`/forums/${forumId}`)
  }
  return <>{children}</>
}
