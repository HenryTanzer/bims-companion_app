-- supabase-lesson-notes.sql
-- Run in Supabase SQL Editor after supabase-curriculum.sql.

CREATE TABLE IF NOT EXISTS lesson_notes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid        NOT NULL REFERENCES profiles(id)           ON DELETE CASCADE,
  lesson_id  uuid        NOT NULL REFERENCES curriculum_lessons(id)  ON DELETE CASCADE,
  content    text        NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_notes_student_own" ON lesson_notes;

CREATE POLICY "lesson_notes_student_own"
  ON lesson_notes FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM curriculum_lessons cl
      JOIN   curriculum_topics ct ON ct.id = cl.topic_id
      JOIN   curriculum_units cu  ON cu.id = ct.unit_id
      JOIN   enrollments e        ON e.subject_id = cu.subject_id
      WHERE  cl.id = lesson_notes.lesson_id
      AND    cl.is_published = true
      AND    e.student_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_lesson_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lesson_notes_updated_at ON lesson_notes;
CREATE TRIGGER lesson_notes_updated_at
  BEFORE UPDATE ON lesson_notes
  FOR EACH ROW EXECUTE FUNCTION update_lesson_notes_updated_at();
