# TODO.md

## Immediate Tasks
- [ ] **CREATE Supabase Storage bucket** — go to Supabase dashboard → Storage → New bucket → name: `past-papers` → Public: on. Required before teacher PDF upload works. *(manual step)*
- [ ] **Run `supabase-modules.sql`** in Supabase SQL Editor — creates `modules`, `module_questions`, `module_submissions` tables with RLS. *(not yet run)*
- [ ] **Test signup flow end-to-end** — create a new student account, select subjects, verify enrollments row in Supabase, verify redirect to `/student` *(UNVERIFIED)*
- [ ] **Test Study Buddy** — verify streaming works, subject switching clears chat, "no subjects" state *(UNVERIFIED)*
- [ ] **Test Exam Centre** — verify PDF upload after bucket is created, delete removes from Storage + DB *(UNVERIFIED)*
- [ ] **Test Profile pages** — verify name update saves to Supabase for both student and teacher *(UNVERIFIED)*
- [ ] **Test Modules system** — verify teacher can create/publish/delete modules, student can attempt and submit, gradebook shows correct scores *(UNVERIFIED)*

## Later Tasks
- [ ] Teacher analytics — quiz attempt breakdown by subject, student performance over time; Student Monitor + Coverage Grid inside Exam Centre
- [ ] Teacher messages — send message to individual student or all students in a subject
- [ ] Student notifications page — display messages received from teachers
- [ ] Review / Weak areas — student tool surfacing questions they've previously answered incorrectly
- [ ] Study Timer — timed study sessions with XP reward
- [ ] Daily Challenge — gamified daily prompt (+35 XP)
- [ ] Discussions — teacher/student discussion threads
- [ ] Deploy to Vercel — connect GitHub repo, set environment variables in Vercel dashboard
- [ ] PWA config — add `manifest.json` and service worker for offline support
- [ ] Light mode polish — verify all components look correct in light theme
- [ ] Consider switching to `supabase gen types typescript` to remove `as any` casts (schema must be stable first)
- [ ] Enable email confirmation in Supabase Auth for production (currently off for dev convenience)

## Bugs / Issues
- **Email confirmation** — Unverified whether it is off in Supabase dashboard. If on, new signups won't work without email access.
- **600ms trigger delay at signup** — Signup page waits 600ms after `signUp()` for the DB trigger to create the `profiles` row before inserting enrollments. If Supabase is slow, this could race. *(UNVERIFIED in practice)*
- **Streak reset on Monday** — `lessons_this_week` resets if `last_active_date` isn't the same Monday. Logic is in `src/lib/progress.ts`. *(UNVERIFIED — not tested across a week boundary)*
- **`past-papers` Storage bucket** — Teacher PDF upload will error with bucket-not-found until bucket is created manually in Supabase dashboard.

## Completed This Session ✅
- Changed third subject from Geography to Business across all files and live database
- Updated `src/types/database.ts` — `SubjectName` is now `'IT' | 'Business' | 'Biology'`
- Updated `src/app/layout.tsx` — metadata description updated to "IT, Business and Biology"
- Updated `supabase-schema.sql` — CHECK constraint and seed INSERT now use Business (color `#8b5cf6`, icon `briefcase`)
- Rewrote `supabase-seed-questions.sql` — 5 Geography questions replaced with 5 A-Level Business questions; variable renamed `geo_id` → `bus_id`
- Rewrote `supabase-seed-flashcards.sql` — 8 Geography flashcards replaced with 8 Business flashcards; variable renamed `geo_id` → `bus_id`
- Created `supabase-migrate-geography-to-business.sql` — run on live DB to rename Geography → Business
- Ran migration on live Supabase database ✅ (confirmed Business row present with correct values)
- Deleted old Geography questions and flashcards from live DB and inserted new Business content ✅
- Built full Modules/Assignments system:
  - `supabase-modules.sql` — three new tables (`modules`, `module_questions`, `module_submissions`) with RLS *(not yet run)*
  - `src/app/student/modules/page.tsx` — server component, fetches published modules for enrolled subjects
  - `src/components/student/module-list.tsx` — module cards with status (submitted/overdue/not started), links to attempt page
  - `src/app/student/modules/[id]/page.tsx` — dynamic route, fetches module + questions + existing submission
  - `src/components/student/module-attempt.tsx` — full attempt UI (one question at a time, prev/next, reveal, submit) + results view with per-question review
  - `src/app/teacher/modules/page.tsx` — server component, fetches teacher's modules + question counts + submission counts
  - `src/components/teacher/module-manager.tsx` — create module (subject, title, instructions, due date, question picker), list with publish/unpublish/delete, on-demand gradebook per module
  - Added Modules link to both sidebars

## Previously Completed ✅
- AI Study Buddy: `/api/study-buddy/route.ts` (streaming Anthropic SDK), `study-buddy-chat.tsx`, updated `study-buddy/page.tsx`
- Student Exam Centre: `exam-center/page.tsx`, `exam-center-view.tsx`
- Teacher Exam Centre: `teacher/exam-center/page.tsx`, `exam-center-manager.tsx`
- Profile pages: `profile-form.tsx` (shared), `student/profile/page.tsx`, `teacher/profile/page.tsx`
- Signup page with subject selection
- Student dashboard, quiz, flashcards, progress, leaderboard
- Teacher content manager, students page, `StudentEnroller` component
- `src/lib/progress.ts` shared XP/streak/level utility
- TypeScript passing clean (`tsc --noEmit` no errors)

## Files Changed This Session
```
UPDATED:
  src/types/database.ts               — SubjectName: Geography → Business; added modules/module_questions/module_submissions types
  src/app/layout.tsx                  — metadata description updated
  supabase-schema.sql                 — CHECK constraint + seed INSERT updated
  supabase-seed-questions.sql         — Geography questions replaced with Business questions
  supabase-seed-flashcards.sql        — Geography flashcards replaced with Business flashcards
  src/components/layout/student-sidebar.tsx — Modules link added
  src/components/layout/teacher-sidebar.tsx — Modules link added

CREATED:
  supabase-migrate-geography-to-business.sql
  supabase-modules.sql
  src/app/student/modules/page.tsx
  src/components/student/module-list.tsx
  src/app/student/modules/[id]/page.tsx
  src/components/student/module-attempt.tsx
  src/app/teacher/modules/page.tsx
  src/components/teacher/module-manager.tsx
```

## Commands to Run Next
```bash
# Start dev server
npm run dev
# → http://localhost:3000

# Type check (should be clean)
npx tsc --noEmit
```

Manual steps before testing:
1. Supabase SQL Editor → run `supabase-modules.sql` (creates modules tables)
2. Supabase dashboard → Storage → New bucket → name: `past-papers` → Public: on
