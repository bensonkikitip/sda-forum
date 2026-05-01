import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin-nav'
import { CreateTopicForm } from './_components/topic-form'
import { DeleteTopicButton } from './_components/delete-topic-button'
import { Tag } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminTopicsPage() {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: topics } = await admin
    .from('topics')
    .select('id, slug, name, icon, color, sort_order')
    .order('sort_order')
    .order('name')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-bold">Topics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Topics let pastors tag posts so members can choose which kinds of content they hear about.
        </p>
      </div>

      <CreateTopicForm />

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Existing topics ({(topics ?? []).length})
        </h2>
        {(topics ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No topics yet. Create one above.</p>
        ) : (
          <div className="space-y-2">
            {(topics ?? []).map(t => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                {/* Colour swatch */}
                <div
                  className="h-8 w-8 rounded-md shrink-0 flex items-center justify-center text-base"
                  style={{ backgroundColor: t.color ? `${t.color}20` : undefined }}
                >
                  {t.icon ?? <Tag className="h-4 w-4 text-muted-foreground" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    {/* Colour pill */}
                    {t.color && (
                      <span
                        className="inline-block h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
                </div>

                <DeleteTopicButton topicId={t.id} topicName={t.name} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
