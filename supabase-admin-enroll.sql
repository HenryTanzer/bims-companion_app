-- Auto-enroll admins in all teacher_subjects when their profile is created
-- or when an existing profile is promoted to the admin role.
-- Run this AFTER supabase-teacher-subjects.sql has been executed.

CREATE OR REPLACE FUNCTION handle_admin_subject_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    INSERT INTO teacher_subjects (teacher_id, subject_id)
    SELECT NEW.id, id FROM subjects
    ON CONFLICT (teacher_id, subject_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Fires on new admin profiles and on role changes to admin
DROP TRIGGER IF EXISTS on_admin_profile_upsert ON profiles;
CREATE TRIGGER on_admin_profile_upsert
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_admin_subject_enrollment();
