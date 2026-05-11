-- ============================================================
-- Migration: Rename Geography subject to Business
-- Run this in Supabase SQL Editor ONCE on the live database
-- Safe to run even if Geography data already exists
-- ============================================================

-- Step 1: Drop the old CHECK constraint and add the new one
ALTER TABLE public.subjects
  DROP CONSTRAINT IF EXISTS subjects_name_check;

ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_name_check
  CHECK (name IN ('IT', 'Business', 'Biology'));

-- Step 2: Update the Geography row to Business
UPDATE public.subjects
SET
  name        = 'Business',
  description = 'A-Level Business Studies',
  color       = '#8b5cf6',
  icon        = 'briefcase'
WHERE name = 'Geography';

-- Step 3: Confirm
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.subjects WHERE name = 'Business') THEN
    RAISE NOTICE 'Migration complete — Business subject is active.';
  ELSE
    RAISE WARNING 'Business row not found — check if Geography existed before running this.';
  END IF;
END $$;
