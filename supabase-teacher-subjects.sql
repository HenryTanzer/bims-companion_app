-- Teacher subject assignments
-- Run this in Supabase SQL editor before testing teacher subject filtering.

CREATE TABLE IF NOT EXISTS teacher_subjects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id  uuid        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, subject_id)
);

ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;

-- Teachers can read and insert their own assignment; admins can do everything
CREATE POLICY "teacher_subjects_select"
  ON teacher_subjects FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "teacher_subjects_insert"
  ON teacher_subjects FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "teacher_subjects_admin_all"
  ON teacher_subjects FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
