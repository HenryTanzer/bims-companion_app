-- Textbook import jobs
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS curriculum_import_jobs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id  UUID        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'outline_pending'
                CHECK (status IN ('outline_pending', 'outline_ready', 'generating', 'done')),
  outline     JSONB,
  file_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE curriculum_import_jobs ENABLE ROW LEVEL SECURITY;

-- Teachers manage their own jobs
CREATE POLICY "teachers_manage_own_import_jobs" ON curriculum_import_jobs
  FOR ALL USING (teacher_id = auth.uid());

-- Admins can view all
CREATE POLICY "admins_view_all_import_jobs" ON curriculum_import_jobs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
