import { createClient } from '@/lib/supabase/server'

export async function getForums() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('forums')
    .select('id, slug, name, description, icon, color')
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function getForumBySlug(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('forums')
    .select('*')
    .eq('slug', slug)
    .single()
  return data
}

export async function getForumById(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('forums')
    .select('*')
    .eq('id', id)
    .single()
  return data
}
