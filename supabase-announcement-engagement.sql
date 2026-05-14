-- supabase-announcement-engagement.sql
-- Run in Supabase SQL Editor after supabase-announcements.sql.

create table if not exists public.announcement_engagements (
  id              uuid        primary key default gen_random_uuid(),
  announcement_id uuid        not null references public.announcements(id) on delete cascade,
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  seen_at         timestamptz not null default now(),
  reaction        text        null check (reaction in ('👍', '✅', '🙌', '💡', '❓')),
  reacted_at      timestamptz null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (announcement_id, user_id)
);

alter table public.announcement_engagements enable row level security;

drop policy if exists "Users can manage own announcement engagement" on public.announcement_engagements;
drop policy if exists "Announcement senders can read engagement" on public.announcement_engagements;

create policy "Users can manage own announcement engagement"
  on public.announcement_engagements for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.announcements a
      where a.id = announcement_engagements.announcement_id
      and (
        a.subject_id is null
        or a.subject_id in (
          select subject_id from public.enrollments where student_id = auth.uid()
        )
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role in ('teacher', 'admin')
        )
      )
    )
  );

create policy "Announcement senders can read engagement"
  on public.announcement_engagements for select to authenticated
  using (
    exists (
      select 1
      from public.announcements a
      where a.id = announcement_engagements.announcement_id
      and (
        a.teacher_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
    )
  );

create or replace function update_announcement_engagement_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists announcement_engagement_updated_at on public.announcement_engagements;
create trigger announcement_engagement_updated_at
  before update on public.announcement_engagements
  for each row execute function update_announcement_engagement_updated_at();
