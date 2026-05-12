-- supabase-curriculum.sql
-- Run in Supabase SQL Editor
--
-- MANUAL STEP FIRST:
-- Supabase → Storage → New bucket
--   Name: lesson-media   Public: YES
--
-- Run AFTER supabase-teacher-subjects.sql has been applied cleanly.

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS curriculum_units (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  uuid        NOT NULL REFERENCES subjects(id)  ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  year_group  text        NOT NULL DEFAULT 'Both'
                          CHECK (year_group IN ('Year 12', 'Year 13', 'Both')),
  position    integer     NOT NULL DEFAULT 0,
  created_by  uuid        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS curriculum_topics (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id     uuid        NOT NULL REFERENCES curriculum_units(id)  ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  position    integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS curriculum_lessons (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id          uuid        NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  title             text        NOT NULL,
  learning_outcomes text[]      NOT NULL DEFAULT '{}',
  content           jsonb       NOT NULL DEFAULT '[]',
  is_published      boolean     NOT NULL DEFAULT false,
  position          integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         uuid        NOT NULL REFERENCES profiles(id)           ON DELETE CASCADE,
  lesson_id          uuid        NOT NULL REFERENCES curriculum_lessons(id)  ON DELETE CASCADE,
  is_completed       boolean     NOT NULL DEFAULT false,
  completed_at       timestamptz,
  manually_completed boolean     NOT NULL DEFAULT false,
  UNIQUE(student_id, lesson_id)
);

-- ─── Migrate existing tables ──────────────────────────────────────────────────

ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES curriculum_lessons(id) ON DELETE SET NULL;
ALTER TABLE flashcards     ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES curriculum_lessons(id) ON DELETE SET NULL;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE curriculum_units   ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_topics  ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress    ENABLE ROW LEVEL SECURITY;

-- curriculum_units ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "curriculum_units_select"        ON curriculum_units;
DROP POLICY IF EXISTS "curriculum_units_teacher_write" ON curriculum_units;

CREATE POLICY "curriculum_units_select"
  ON curriculum_units FOR SELECT TO authenticated USING (true);

CREATE POLICY "curriculum_units_teacher_write"
  ON curriculum_units FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM teacher_subjects ts
            WHERE ts.teacher_id = auth.uid() AND ts.subject_id = curriculum_units.subject_id)
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM teacher_subjects ts
            WHERE ts.teacher_id = auth.uid() AND ts.subject_id = curriculum_units.subject_id)
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- curriculum_topics ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "curriculum_topics_select"        ON curriculum_topics;
DROP POLICY IF EXISTS "curriculum_topics_teacher_write" ON curriculum_topics;

CREATE POLICY "curriculum_topics_select"
  ON curriculum_topics FOR SELECT TO authenticated USING (true);

CREATE POLICY "curriculum_topics_teacher_write"
  ON curriculum_topics FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM curriculum_units cu
      WHERE  cu.id = curriculum_topics.unit_id
      AND (
        EXISTS (SELECT 1 FROM teacher_subjects ts
                WHERE ts.teacher_id = auth.uid() AND ts.subject_id = cu.subject_id)
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM curriculum_units cu
      WHERE  cu.id = curriculum_topics.unit_id
      AND (
        EXISTS (SELECT 1 FROM teacher_subjects ts
                WHERE ts.teacher_id = auth.uid() AND ts.subject_id = cu.subject_id)
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

-- curriculum_lessons ───────────────────────────────────────────────────────────
-- Teachers see all lessons in their subject; students see only published + enrolled.
DROP POLICY IF EXISTS "curriculum_lessons_teacher_all"    ON curriculum_lessons;
DROP POLICY IF EXISTS "curriculum_lessons_student_select" ON curriculum_lessons;

CREATE POLICY "curriculum_lessons_teacher_all"
  ON curriculum_lessons FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM curriculum_topics ct
      JOIN   curriculum_units cu ON cu.id = ct.unit_id
      WHERE  ct.id = curriculum_lessons.topic_id
      AND (
        EXISTS (SELECT 1 FROM teacher_subjects ts
                WHERE ts.teacher_id = auth.uid() AND ts.subject_id = cu.subject_id)
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM curriculum_topics ct
      JOIN   curriculum_units cu ON cu.id = ct.unit_id
      WHERE  ct.id = curriculum_lessons.topic_id
      AND (
        EXISTS (SELECT 1 FROM teacher_subjects ts
                WHERE ts.teacher_id = auth.uid() AND ts.subject_id = cu.subject_id)
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

CREATE POLICY "curriculum_lessons_student_select"
  ON curriculum_lessons FOR SELECT TO authenticated
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM curriculum_topics ct
      JOIN   curriculum_units cu ON cu.id = ct.unit_id
      JOIN   enrollments e       ON e.subject_id = cu.subject_id
      WHERE  ct.id = curriculum_lessons.topic_id
      AND    e.student_id = auth.uid()
    )
  );

-- lesson_progress ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "lesson_progress_student_own"    ON lesson_progress;
DROP POLICY IF EXISTS "lesson_progress_teacher_select" ON lesson_progress;

CREATE POLICY "lesson_progress_student_own"
  ON lesson_progress FOR ALL TO authenticated
  USING    (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "lesson_progress_teacher_select"
  ON lesson_progress FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin'))
  );

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_lesson_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS curriculum_lessons_updated_at ON curriculum_lessons;
CREATE TRIGGER curriculum_lessons_updated_at
  BEFORE UPDATE ON curriculum_lessons
  FOR EACH ROW EXECUTE FUNCTION update_lesson_updated_at();
