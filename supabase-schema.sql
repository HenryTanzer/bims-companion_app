-- ============================================================
-- BIMS Companion App — Full Database Schema
-- Paste this into Supabase SQL Editor and click Run
-- ============================================================

-- ── Profiles ─────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('student', 'teacher', 'admin')) default 'student',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Subjects ─────────────────────────────────────────────────
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('IT', 'Business', 'Biology')),
  description text,
  color text not null default '#6366f1',
  icon text,
  created_at timestamptz default now()
);

-- Seed the 3 subjects
insert into public.subjects (name, description, color, icon) values
  ('IT', 'A-Level Information Technology', '#3b82f6', 'monitor'),
  ('Business', 'A-Level Business Studies', '#8b5cf6', 'briefcase'),
  ('Biology', 'A-Level Biology', '#f97316', 'microscope');

-- ── Topics ───────────────────────────────────────────────────
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  description text,
  order_index integer not null default 0,
  created_at timestamptz default now()
);

-- ── Enrollments ──────────────────────────────────────────────
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  enrolled_at timestamptz default now(),
  unique (student_id, subject_id)
);

-- ── Quiz Questions ───────────────────────────────────────────
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  question text not null,
  options jsonb not null,  -- array of 4 strings
  correct_answer integer not null check (correct_answer between 0 and 3),
  explanation text,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')) default 'medium',
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- ── Quiz Attempts ─────────────────────────────────────────────
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  score integer not null,
  total_questions integer not null,
  answers jsonb not null default '{}',
  xp_earned integer not null default 0,
  completed_at timestamptz default now()
);

-- ── Flashcards ────────────────────────────────────────────────
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  term text not null,
  definition text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- ── Flashcard Reviews (spaced repetition) ────────────────────
create table public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  flashcard_id uuid not null references public.flashcards(id) on delete cascade,
  confidence integer not null check (confidence between 1 and 5) default 3,
  next_review_at timestamptz default now(),
  review_count integer not null default 0,
  last_reviewed_at timestamptz default now(),
  unique (student_id, flashcard_id)
);

-- ── Past Papers ───────────────────────────────────────────────
create table public.past_papers (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  year integer not null,
  paper_number integer default 1,
  file_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- ── User Progress ─────────────────────────────────────────────
create table public.user_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles(id) on delete cascade,
  xp integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  last_active_date date,
  weekly_goal integer not null default 5,
  lessons_this_week integer not null default 0,
  updated_at timestamptz default now()
);

-- Auto-create progress row for new students
create or replace function public.handle_new_student_progress()
returns trigger as $$
begin
  if new.role = 'student' then
    insert into public.user_progress (student_id)
    values (new.id)
    on conflict (student_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_student_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_student_progress();

-- ── Messages ──────────────────────────────────────────────────
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  content text not null,
  is_group boolean not null default false,
  read boolean not null default false,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.enrollments enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.flashcards enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.past_papers enable row level security;
alter table public.user_progress enable row level security;
alter table public.messages enable row level security;

-- Profiles: users can read all, only update their own
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Subjects: everyone can read
create policy "subjects_select" on public.subjects for select using (true);
create policy "subjects_insert" on public.subjects for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
);

-- Topics: everyone can read, teachers can create
create policy "topics_select" on public.topics for select using (true);
create policy "topics_insert" on public.topics for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
);
create policy "topics_update" on public.topics for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
);
create policy "topics_delete" on public.topics for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
);

-- Enrollments: students see their own, teachers see all
create policy "enrollments_select_own" on public.enrollments for select using (
  student_id = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
);
create policy "enrollments_insert" on public.enrollments for insert with check (
  student_id = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
);
create policy "enrollments_delete" on public.enrollments for delete using (
  student_id = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
);

-- Quiz questions: everyone reads, teachers write
create policy "quiz_questions_select" on public.quiz_questions for select using (true);
create policy "quiz_questions_insert" on public.quiz_questions for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
);
create policy "quiz_questions_update" on public.quiz_questions for update using (
  created_by = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "quiz_questions_delete" on public.quiz_questions for delete using (
  created_by = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Quiz attempts: students own theirs, teachers see all
create policy "quiz_attempts_select" on public.quiz_attempts for select using (
  student_id = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
);
create policy "quiz_attempts_insert" on public.quiz_attempts for insert with check (
  student_id = auth.uid()
);

-- Flashcards: everyone reads, teachers write
create policy "flashcards_select" on public.flashcards for select using (true);
create policy "flashcards_insert" on public.flashcards for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
);
create policy "flashcards_update" on public.flashcards for update using (
  created_by = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "flashcards_delete" on public.flashcards for delete using (
  created_by = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Flashcard reviews: students own theirs only
create policy "flashcard_reviews_select" on public.flashcard_reviews for select using (student_id = auth.uid());
create policy "flashcard_reviews_insert" on public.flashcard_reviews for insert with check (student_id = auth.uid());
create policy "flashcard_reviews_update" on public.flashcard_reviews for update using (student_id = auth.uid());

-- Past papers: everyone reads, teachers write
create policy "past_papers_select" on public.past_papers for select using (true);
create policy "past_papers_insert" on public.past_papers for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
);
create policy "past_papers_delete" on public.past_papers for delete using (
  created_by = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- User progress: students own theirs, teachers read all
create policy "user_progress_select" on public.user_progress for select using (
  student_id = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
);
create policy "user_progress_insert" on public.user_progress for insert with check (student_id = auth.uid());
create policy "user_progress_update" on public.user_progress for update using (student_id = auth.uid());

-- Messages: sender or recipient can read
create policy "messages_select" on public.messages for select using (
  sender_id = auth.uid() or recipient_id = auth.uid() or is_group = true
);
create policy "messages_insert" on public.messages for insert with check (sender_id = auth.uid());
create policy "messages_update" on public.messages for update using (recipient_id = auth.uid());
