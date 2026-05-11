-- Daily challenge attempts table
-- Run once in Supabase SQL editor

create table public.daily_challenge_attempts (
  id             uuid        primary key default gen_random_uuid(),
  student_id     uuid        not null references public.profiles(id) on delete cascade,
  question_id    uuid        not null references public.quiz_questions(id) on delete cascade,
  challenge_date date        not null default current_date,
  correct        boolean     not null,
  xp_earned      int         not null default 0,
  created_at     timestamptz not null default now(),
  unique(student_id, challenge_date)
);

alter table public.daily_challenge_attempts enable row level security;

create policy "Students can insert own attempts" on public.daily_challenge_attempts
  for insert with check (auth.uid() = student_id);

create policy "Students can read own attempts" on public.daily_challenge_attempts
  for select using (auth.uid() = student_id);

create policy "Teachers can read all attempts" on public.daily_challenge_attempts
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
  );
