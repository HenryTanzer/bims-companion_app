'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cacheQuestions, cacheFlashcards } from '@/lib/offline-db'

export function OfflineSync({ studentId }: { studentId: string }) {
  useEffect(() => {
    if (!navigator.onLine) return

    async function sync() {
      const supabase = createClient()

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('subject_id')
        .eq('student_id', studentId)

      if (!enrollments || enrollments.length === 0) return
      const subjectIds = (enrollments as any[]).map(e => e.subject_id)

      const [questionsRes, flashcardsRes] = await Promise.all([
        supabase
          .from('quiz_questions')
          .select('id, subject_id, topic_id, question, options, correct_answer, explanation, difficulty')
          .in('subject_id', subjectIds),
        supabase
          .from('flashcards')
          .select('id, subject_id, topic_id, term, definition')
          .in('subject_id', subjectIds),
      ])

      if (questionsRes.data && questionsRes.data.length > 0) {
        await cacheQuestions(questionsRes.data as any)
      }
      if (flashcardsRes.data && flashcardsRes.data.length > 0) {
        await cacheFlashcards(flashcardsRes.data as any)
      }
    }

    sync().catch(() => {})
  }, [studentId])

  return null
}
