-- Announcements table for teacher → student broadcasts
-- Run once in Supabase SQL editor

create table public.announcements (
  id         uuid        primary key default gen_random_uuid(),
  teacher_id uuid        not null references public.profiles(id) on delete cascade,
  subject_id uuid        null     references public.subjects(id) on delete cascade,
  title      text        not null,
  body       text        not null,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

-- Teachers and admins can read all announcements (sent history)
create policy "Teachers can read announcements" on public.announcements
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('teacher', 'admin')
    )
  );

-- Teachers insert their own announcements
create policy "Teachers can insert announcements" on public.announcements
  for insert with check (auth.uid() = teacher_id);

-- Teachers can delete their own announcements
create policy "Teachers can delete own announcements" on public.announcements
  for delete using (auth.uid() = teacher_id);

-- Students see announcements for their enrolled subjects, plus all-student (null) ones
create policy "Students can read relevant announcements" on public.announcements
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'student'
    )
    and (
      subject_id is null
      or subject_id in (
        select subject_id from public.enrollments where student_id = auth.uid()
      )
    )
  );
