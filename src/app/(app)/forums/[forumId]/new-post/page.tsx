import { createClient } from '@/lib/supabase/server'
import { NewPostForm } from './_components/new-post-form'

export const dynamic = 'force-dynamic'

export default async function NewPostPage({
  params,
}: {
  params: Promise<{ forumId: string }>
}) {
  const { forumId } = await params
  const supabase = await createClient()

  const { data: topics } = await supabase
    .from('topics')
    .select('id, name, icon, color')
    .order('sort_order')
    .order('name')

  return <NewPostForm forumId={forumId} topics={topics ?? []} />
}
