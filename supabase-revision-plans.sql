-- supabase-revision-plans.sql
-- Run in Supabase SQL Editor after the core schema, curriculum, modules, and lesson notes migrations.

create table if not exists public.revision_plans (
  id          uuid        primary key default gen_random_uuid(),
  student_id  uuid        not null references public.profiles(id) on delete cascade,
  subject_id  uuid        not null references public.subjects(id) on delete cascade,
  title       text        not null,
  description text        null,
  focus_areas text[]      not null default '{}',
  tasks       jsonb       not null default '[]'::jsonb,
  source      text        not null default 'teacher' check (source in ('ai', 'teacher')),
  status      text        not null default 'active' check (status in ('active', 'completed', 'archived')),
  due_date    date        null,
  created_by  uuid        null references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.revision_plans enable row level security;

drop policy if exists "Students can read own revision plans" on public.revision_plans;
drop policy if exists "Students can create own AI revision plans" on public.revision_plans;
drop policy if exists "Students can update own revision plan status" on public.revision_plans;
drop policy if exists "Teachers can read managed revision plans" on public.revision_plans;
drop policy if exists "Teachers can manage custom revision plans" on public.revision_plans;

create policy "Students can read own revision plans"
  on public.revision_plans for select to authenticated
  using (student_id = auth.uid());

create policy "Students can create own AI revision plans"
  on public.revision_plans for insert to authenticated
  with check (
    student_id = auth.uid()
    and source = 'ai'
    and exists (
      select 1 from public.enrollments e
      where e.student_id = auth.uid()
      and e.subject_id = revision_plans.subject_id
    )
  );

create policy "Students can update own revision plan status"
  on public.revision_plans for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "Teachers can read managed revision plans"
  on public.revision_plans for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
      and p.role = 'admin'
    )
    or exists (
      select 1
      from public.teacher_subjects ts
      join public.enrollments e
        on e.subject_id = ts.subject_id
       and e.student_id = revision_plans.student_id
      where ts.teacher_id = auth.uid()
      and ts.subject_id = revision_plans.subject_id
    )
  );

create policy "Teachers can manage custom revision plans"
  on public.revision_plans for all to authenticated
  using (
    source = 'teacher'
    and (
      created_by = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
        and p.role = 'admin'
      )
    )
  )
  with check (
    source = 'teacher'
    and created_by = auth.uid()
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
        and p.role = 'admin'
      )
      or exists (
        select 1
        from public.teacher_subjects ts
        join public.enrollments e
          on e.subject_id = ts.subject_id
         and e.student_id = revision_plans.student_id
        where ts.teacher_id = auth.uid()
        and ts.subject_id = revision_plans.subject_id
      )
    )
  );

create or replace function update_revision_plans_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists revision_plans_updated_at on public.revision_plans;
create trigger revision_plans_updated_at
  before update on public.revision_plans
  for each row execute function update_revision_plans_updated_at();

create index if not exists revision_plans_student_idx on public.revision_plans(student_id, status);
create index if not exists revision_plans_subject_idx on public.revision_plans(subject_id);
