import type { SupabaseClient } from '@supabase/supabase-js'

export type TeacherContext = {
  role: string
  subjectIds: string[]
  isAdmin: boolean
}

/**
 * Returns the teacher's assigned subject IDs and whether they are an admin.
 * Admins get isAdmin=true and an empty subjectIds — callers should skip
 * subject filtering when isAdmin is true.
 */
export async function getTeacherContext(
  supabase: SupabaseClient,
  userId: string
): Promise<TeacherContext> {
  const [profileRes, subjectsRes] = await Promise.all([
    (supabase as any).from('profiles').select('role').eq('id', userId).single(),
    (supabase as any).from('teacher_subjects').select('subject_id').eq('teacher_id', userId),
  ])
  const role: string = profileRes.data?.role ?? 'teacher'
  const subjectIds: string[] = (subjectsRes.data ?? []).map((r: any) => r.subject_id as string)
  return { role, subjectIds, isAdmin: role === 'admin' }
}
