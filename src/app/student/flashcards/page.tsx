import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FlashcardLauncher } from '@/components/student/flashcard-launcher'

export default async function FlashcardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [subjectsRes, topicsRes] = await Promise.all([
    supabase.from('subjects').select('id, name, color'),
    supabase.from('topics').select('id, subject_id, name'),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Flashcards</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Flip cards to reveal definitions. Rate your confidence to schedule the next review.
        </p>
      </div>
      <FlashcardLauncher
        subjects={subjectsRes.data ?? []}
        topics={topicsRes.data ?? []}
        studentId={user.id}
      />
    </div>
  )
}
