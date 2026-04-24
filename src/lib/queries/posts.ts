import { createClient } from '@/lib/supabase/server'

export type SortOrder = 'newest' | 'top'

type AuthorRow = { id: string; display_name: string; avatar_url: string | null }

async function fetchAuthorMap(supabase: Awaited<ReturnType<typeof createClient>>, authorIds: string[]) {
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

export async function getPostById(postId: string) {
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('posts')
    .select(`
      id, title, body_md, is_pinned, is_locked, is_removed, comment_count, created_at, forum_id, author_id,
      post_images(id, storage_path, position)
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
