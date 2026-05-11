-- Study sessions table
-- Run this in Supabase SQL editor before testing the Study Timer.

CREATE TABLE IF NOT EXISTS study_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  subject_id       uuid                    REFERENCES subjects(id) ON DELETE SET NULL,
  duration_minutes int         NOT NULL,
  xp_earned        int         NOT NULL DEFAULT 0,
  completed        boolean     NOT NULL DEFAULT false,
  started_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own sessions"
  ON study_sessions FOR ALL
  TO authenticated
  USING   (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers and admins can read all sessions"
  ON study_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );
