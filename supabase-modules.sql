-- ============================================================
-- BIMS Companion — Modules / Assignments Schema
-- Paste into Supabase SQL Editor and click Run
-- Run AFTER supabase-schema.sql has already been executed
-- ============================================================

-- ── Modules (teacher-created assignments) ─────────────────────
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  is_published boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- ── Module Questions (which quiz questions are in a module) ───
create table public.module_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  order_index integer not null default 0,
  unique (module_id, question_id)
);

-- ── Module Submissions (one per student per module) ────────────
create table public.module_submissions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}',   -- { question_id: selected_answer_index }
  score integer,                          -- correct answer count; null until submitted
  total_questions integer,                -- snapshot at submission time
  submitted_at timestamptz,
  created_at timestamptz default now(),
  unique (module_id, student_id)
);

-- ── RLS ───────────────────────────────────────────────────────
alter table public.modules enable row level security;
alter table public.module_questions enable row level security;
alter table public.module_submissions enable row level security;

-- Modules: students read published only; teachers read/write their own
create policy "modules_select_student" on public.modules for select using (
  is_published = true or
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher','admin'))
);
create policy "modules_insert" on public.modules for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher','admin'))
);
create policy "modules_update" on public.modules for update using (
  created_by = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "modules_delete" on public.modules for delete using (
  created_by = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Module questions: all authenticated users read; teachers write
create policy "module_questions_select" on public.module_questions for select using (true);
create policy "module_questions_insert" on public.module_questions for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher','admin'))
);
create policy "module_questions_delete" on public.module_questions for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher','admin'))
);

-- Module submissions: students own theirs; teachers read all
create policy "module_submissions_select" on public.module_submissions for select using (
  student_id = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher','admin'))
);
create policy "module_submissions_insert" on public.module_submissions for insert with check (
  student_id = auth.uid()
);
create policy "module_submissions_update" on public.module_submissions for update using (
  student_id = auth.uid()
);
