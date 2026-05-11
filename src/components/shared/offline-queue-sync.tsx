'use client'

import { useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { getAllQueued, removeQueued } from '@/lib/offline-db'
import { updateStudentProgress } from '@/lib/progress'

export function OfflineQueueSync() {
  const processQueue = useCallback(async () => {
    const queue = await getAllQueued()
    if (queue.length === 0) return

    const supabase = createClient()
    let synced = 0

    for (const entry of queue) {
      try {
        if (entry.type === 'quiz_attempt') {
          const { payload } = entry
          await supabase.from('quiz_attempts').insert({
            student_id: payload.student_id,
            subject_id: payload.subject_id,
            topic_id: payload.topic_id,
            score: payload.score,
            total_questions: payload.total_questions,
            answers: payload.answers,
            xp_earned: payload.xp_earned,
          } as any)
          await updateStudentProgress(payload.student_id, payload.xp_earned)
        }

        if (entry.type === 'flashcard_session') {
          const { payload } = entry
          for (const review of payload.reviews) {
            await supabase.from('flashcard_reviews').upsert({
              student_id: payload.student_id,
              flashcard_id: review.flashcard_id,
              confidence: review.confidence,
              next_review_at: review.next_review_at,
              last_reviewed_at: new Date().toISOString(),
              review_count: 1,
            } as any, { onConflict: 'student_id,flashcard_id' })
          }
          await updateStudentProgress(payload.student_id, payload.xp_earned)
        }

        if (entry.type === 'module_submission') {
          const { payload } = entry
          await (supabase as any).from('module_submissions').upsert({
            module_id: payload.module_id,
            student_id: payload.student_id,
            answers: payload.answers,
            score: payload.score,
            total_questions: payload.total_questions,
            submitted_at: new Date().toISOString(),
          })
          if (payload.xp_earned > 0) {
            await updateStudentProgress(payload.student_id, payload.xp_earned)
          }
        }

        await removeQueued(entry.id)
        synced++
      } catch {
        // Leave failed entries in the queue — will retry next time online
      }
    }

    if (synced > 0) {
      toast.success(`${synced} offline session${synced > 1 ? 's' : ''} synced successfully.`)
    }
  }, [])

  useEffect(() => {
    if (navigator.onLine) processQueue()

    window.addEventListener('online', processQueue)
    return () => window.removeEventListener('online', processQueue)
  }, [processQueue])

  return null
}
