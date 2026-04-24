import { redirect } from 'next/navigation'
import { requireUser, canModerateForumId } from '@/lib/auth'

// Only admins and moderators assigned to this forum can create posts
export default async function NewPostLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ forumId: string }>
}) {
  const { forumId } = await params
  const user = await requireUser()
  const canMod = await canModerateForumId(user.id, forumId)
  if (!canMod) redirect(`/forums/${forumId}`)
  return <>{children}</>
}
