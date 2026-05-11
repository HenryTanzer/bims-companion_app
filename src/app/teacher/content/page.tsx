import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContentManager } from '@/components/teacher/content-manager'

export default async function ContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [subjectsRes, topicsRes] = await Promise.all([
    supabase.from('subjects').select('id, name'),
    supabase.from('topics').select('id, subject_id, name').order('order_index'),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Manager</h1>
        <p className="text-muted-foreground text-sm mt-1">Add quiz questions, flashcards, and topics for your students.</p>
      </div>
      <ContentManager
        subjects={subjectsRes.data ?? []}
        topics={topicsRes.data ?? []}
        teacherId={user.id}
      />
    </div>
  )
}
