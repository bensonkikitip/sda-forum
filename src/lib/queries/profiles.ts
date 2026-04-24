import { createClient } from '@/lib/supabase/server'

export async function getProfileById(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select(`
      id, display_name, avatar_url, date_of_birth, gender, city, dm_opt_in, is_banned, created_at,
      church:churches(id, name, region)
    `)
    .eq('id', userId)
    .maybeSingle()
  return data
}

export async function getRecentPostsByUser(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('id, title, created_at, forum_id, comment_count, forum:forums(name)')
    .eq('author_id', userId)
    .eq('is_removed', false)
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}
