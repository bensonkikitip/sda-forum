import { createClient } from '@/lib/supabase/server'
import { startOfTodayPacific } from '@/lib/utils/dates'

export type SortOrder = 'newest' | 'top'

type AuthorRow = { id: string; display_name: string; avatar_url: string | null }

export async function fetchAuthorMap(supabase: Awaited<ReturnType<typeof createClient>>, authorIds: string[]) {
  if (authorIds.length === 0) return {}
  const unique = [...new Set(authorIds)]
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', unique)
  return Object.fromEntries((data ?? []).map((p: AuthorRow) => [p.id, p]))
}

export async function getPostsForForum(forumId: string, sort: SortOrder = 'newest') {
  const supabase = await createClient()

  let query = supabase
    .from('posts')
    .select('id, title, body_md, is_pinned, is_locked, comment_count, created_at, author_id')
    .eq('forum_id', forumId)
    .eq('is_removed', false)

  if (sort === 'top') {
    query = query.order('is_pinned', { ascending: false })
                 .order('comment_count', { ascending: false })
  } else {
    query = query.order('is_pinned', { ascending: false })
                 .order('created_at', { ascending: false })
  }

  const { data: posts } = await query.limit(50)
  if (!posts?.length) return []

  const profileMap = await fetchAuthorMap(supabase, posts.map(p => p.author_id))
  return posts.map(p => ({ ...p, author: profileMap[p.author_id] ?? null }))
}

/**
 * Return a forum's posts split into two buckets:
 *
 *   - active: all non-event posts + event posts whose date is today or later
 *             (in Pacific time). An event on today's date stays active for the
 *             whole calendar day regardless of what time it starts.
 *             Sorted: pinned first, then by created_at descending.
 *
 *   - past:   event posts whose calendar date has already passed in Pacific time.
 *             Sorted: pinned first, then by event_starts_at descending (most recent first).
 */
export async function getGroupedPostsForForum(forumId: string) {
  const supabase = await createClient()

  const startOfTodayIso = startOfTodayPacific().toISOString()

  const baseCols =
    'id, title, body_md, is_pinned, is_locked, comment_count, created_at, author_id, event_starts_at, event_location'

  const [activeRes, pastRes] = await Promise.all([
    // Active: non-event posts OR events starting today or later
    supabase
      .from('posts')
      .select(baseCols)
      .eq('forum_id', forumId)
      .eq('is_removed', false)
      .or(`event_starts_at.is.null,event_starts_at.gte.${startOfTodayIso}`)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50),
    // Past: events whose date has already passed
    supabase
      .from('posts')
      .select(baseCols)
      .eq('forum_id', forumId)
      .eq('is_removed', false)
      .lt('event_starts_at', startOfTodayIso)
      .order('is_pinned', { ascending: false })
      .order('event_starts_at', { ascending: false })
      .limit(50),
  ])

  const active = activeRes.data ?? []
  const past   = pastRes.data ?? []

  const allAuthorIds = [...active, ...past].map(p => p.author_id)
  const profileMap = await fetchAuthorMap(supabase, allAuthorIds)

  // Fetch topics for every post in one query
  const allPostIds = [...active, ...past].map(p => p.id)
  // Supabase returns joined rows as arrays in its generated types; cast via unknown.
  type TopicData = { id: string; name: string; icon: string | null; color: string | null }
  type TopicRow = { post_id: string; topic_id: string; topics: TopicData | null }
  const topicsByPost: Record<string, TopicRow[]> = {}
  if (allPostIds.length > 0) {
    const { data: ptRows } = await supabase
      .from('post_topics')
      .select('post_id, topic_id, topics(id, name, icon, color)')
      .in('post_id', allPostIds)
    for (const row of (ptRows ?? []) as unknown as TopicRow[]) {
      if (!topicsByPost[row.post_id]) topicsByPost[row.post_id] = []
      topicsByPost[row.post_id].push(row)
    }
  }

  const attach = <T extends { author_id: string; id: string }>(p: T) => ({
    ...p,
    author: profileMap[p.author_id] ?? null,
    post_topics: topicsByPost[p.id] ?? [],
  })

  return {
    active: active.map(attach),
    past:   past.map(attach),
  }
}

export async function getPostById(postId: string) {
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('posts')
    .select(`
      id, title, body_md, is_pinned, is_locked, is_removed, comment_count, created_at, forum_id, author_id,
      event_starts_at, event_ends_at, event_location, event_location_url,
      post_images(id, storage_path, position),
      post_topics(topic_id, topics(id, name, icon, color))
    `)
    .eq('id', postId)
    .single()

  if (!post) return null

  const profileMap = await fetchAuthorMap(supabase, [post.author_id])
  return { ...post, author: profileMap[post.author_id] ?? null }
}

export async function getCommentsForPost(postId: string) {
  const supabase = await createClient()
  const { data: comments } = await supabase
    .from('comments')
    .select('id, body_md, created_at, parent_id, author_id')
    .eq('post_id', postId)
    .eq('is_removed', false)
    .order('created_at', { ascending: true })

  if (!comments?.length) return []

  const profileMap = await fetchAuthorMap(supabase, comments.map(c => c.author_id))
  return comments.map(c => ({ ...c, author: profileMap[c.author_id] ?? null }))
}
