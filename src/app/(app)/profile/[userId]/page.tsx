import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { getProfileById, getRecentPostsByUser } from '@/lib/queries/profiles'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, MapPin, Calendar, User } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StartDmButton } from '@/components/start-dm-button'

export const dynamic = 'force-dynamic'

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const me = await requireUser()
  const [profile, posts] = await Promise.all([
    getProfileById(userId),
    getRecentPostsByUser(userId),
  ])

  if (!profile) notFound()

  const isOwnProfile = me.id === userId
  const church = Array.isArray(profile.church) ? profile.church[0] : profile.church
  const initials = profile.display_name?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Avatar className="h-20 w-20 shrink-0">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                <div className="flex items-center gap-2">
                  {isOwnProfile ? (
                    <Link href="/profile/edit" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                      Edit profile
                    </Link>
                  ) : (
                    profile.dm_opt_in && <StartDmButton targetUserId={userId} />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {profile.city}
                  </span>
                )}
                {profile.gender && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> {profile.gender}
                  </span>
                )}
                {profile.date_of_birth && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Born {format(new Date(profile.date_of_birth), 'MMMM d, yyyy')}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
                </span>
              </div>

              {church && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Church: </span>
                  <span className="font-medium">{church.name}</span>
                  {church.region && <span className="text-muted-foreground"> — {church.region}</span>}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent posts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Recent posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts yet.</p>
          ) : (
            <div className="space-y-2">
              {posts.map(post => {
                const forum = Array.isArray(post.forum) ? post.forum[0] : post.forum
                return (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
                        {post.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {forum?.name ?? 'Group'} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {post.comment_count}
                    </Badge>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
