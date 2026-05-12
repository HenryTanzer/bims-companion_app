# CLAUDE_HANDOFF.md

## App Name & Purpose
**BIMS Companion** — A-Level study platform for Year 12–13 students at BIMS School.
Subjects: IT, Business, Biology.
Three user portals: Student (study tools, XP, streaks), Teacher (content creation, student oversight, scoped to their unit), Admin (user management, school-wide view).
Recreating the original app at https://bims.bi — reviewed Director and Student views in session 2.

---

## Tech Stack
| Layer | Tool | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.6 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS v4 + shadcn/ui | 4.x |
| Database + Auth | Supabase (PostgreSQL + RLS) | @supabase/supabase-js ^2 |
| Auth Middleware | `src/proxy.ts` (Next.js 16 renamed middleware → proxy) | — |
| AI SDK | @anthropic-ai/sdk | ^0.95.1 |
| Notifications | Sonner | ^2.0.7 |
| Theme | next-themes | ^0.4.6 |
| Runtime | Node.js | v24.15.0 |

**Note:** Next.js 16 renamed `middleware.ts` → `proxy.ts`. The exported function must be named `proxy`, not `middleware`.

**Anthropic SDK streaming note:** `MessageStream` in v0.95.1 does NOT have a `.textStream` property. Iterate over the stream directly (`for await (const event of stream)`) and filter for `event.type === 'content_block_delta' && event.delta.type === 'text_delta'` to get text chunks.

---

## Current Development Status
**Deployed to Vercel.** Live and accessible. GitHub repo: `bims-companion_app` (private, master branch).
Vercel project: `bims-companion` under HenryTanzer's account.

---

## Important Files & Folders
```
src/
  app/
    (auth)/
      login/page.tsx              — Login page (email + password, decorative blur-blobs + floating icons) ✅
      signup/page.tsx             — Signup page (name, email, password, role; teacher single-select unit with confirm dialog; decorative bg) ✅
      forgot-password/page.tsx    — Sends Supabase password reset email ✅
      reset-password/page.tsx     — Handles PASSWORD_RECOVERY event, sets new password ✅
    page.tsx                      — Root redirect (role-based: admin→/admin, teacher→/teacher, student→/student)
    layout.tsx                    — Root layout (ThemeProvider, Toaster, ServiceWorkerRegister)
    manifest.ts                   — PWA manifest (Next.js 16 native MetadataRoute.Manifest) ✅
    offline/page.tsx              — Offline fallback page ✅
    api/
      study-buddy/route.ts        — POST route: streams Claude Haiku, strict subject-only guardrails ✅
      extract-questions/route.ts  — POST route: fetches PDF, sends to Claude Sonnet, returns MCQ array ✅ (UNVERIFIED — needs Anthropic credits)
      daily-challenge/route.ts    — POST route: server-side answer check, XP award, inserts attempt ✅ (UNVERIFIED — needs supabase-daily-challenge.sql run first)
    admin/
      layout.tsx                  — Admin layout (server, role guard admin-only, AdminSidebar + topbar)
      page.tsx                    — Admin dashboard (student/teacher/subject counts, avg score, students per subject, recent signups) ✅
      users/page.tsx              — User management: search by name/email, inline role change buttons ✅
      teachers/page.tsx           — Teacher unit management: reassign which subject a teacher covers ✅
    student/
      layout.tsx                  — Student layout (sidebar + topbar + OfflineSync + OfflineQueueSync + TutorialController)
      page.tsx                    — Student dashboard (gradient hero, coloured stat cards, 11 quick-link tiles) ✅
      quiz/page.tsx               — Quiz page (full MCQ flow, XP rewards) ✅
      flashcards/page.tsx         — Flashcards page (3D flip, spaced rep) ✅
      exam-center/page.tsx        — Exam Centre (lists past papers by enrolled subject, opens PDF) ✅
      progress/page.tsx           — Progress analytics (XP bar, stats, per-subject scores, quiz history) ✅
      leaderboard/page.tsx        — Top 25 by XP, medals for top 3, current user highlighted ✅
      study-buddy/page.tsx        — AI chat tutor (subject-aware, streams Claude Haiku) ✅
      profile/page.tsx            — Profile page (edit display name, change password, relaunch tutorial) ✅
      modules/page.tsx            — Lists published modules for enrolled subjects ✅
      modules/[id]/page.tsx       — Individual module attempt page (Next.js 16 async params) ✅
      daily-challenge/page.tsx    — Daily Challenge (one question/day, +35 XP correct) ✅ (UNVERIFIED — needs SQL)
      review/page.tsx             — Review / Weak Areas (surfaces recently-wrong questions) ✅ (UNVERIFIED)
      notifications/page.tsx      — Student notifications / teacher announcements ✅ (UNVERIFIED)
      study-timer/page.tsx        — Study Timer page (fetches enrolled subjects, passes to client view) ✅ (UNVERIFIED — needs supabase-study-timer.sql)
    teacher/
      layout.tsx                  — Teacher layout (sidebar + topbar, role guard + isAdmin prop to sidebar)
      page.tsx                    — Teacher dashboard (stats scoped to teacher's subjects; admin sees all) ✅
      content/page.tsx            — Content manager (scoped to teacher subjects) ✅
      students/page.tsx           — Student list (scoped to teacher subjects) ✅
      exam-center/page.tsx        — Exam Centre (scoped to teacher subjects) ✅
      modules/page.tsx            — Module manager (scoped to teacher subjects) ✅
      analytics/page.tsx          — Analytics dashboard (scoped to teacher subjects; admin sees all) ✅
      messages/page.tsx           — Announcement broadcast (scoped to teacher subjects) ✅ (UNVERIFIED end-to-end)
      profile/page.tsx            — Profile page (edit display name) ✅
  components/
    layout/
      student-sidebar.tsx         — Mobile drawer (hamburger fixed top-left, backdrop, slide-in panel); bims:open/close-sidebar event listeners; gradient logo strip ✅
      teacher-sidebar.tsx         — Mobile drawer (same pattern); "Admin portal" link shown only when isAdmin=true ✅
      admin-sidebar.tsx           — Mobile drawer (same pattern) ✅
    shared/
      theme-provider.tsx
      theme-toggle.tsx
      profile-form.tsx            — Shared profile editor + change password + "Take the tour" relaunch button (clears both portal tutorial keys) ✅
      service-worker-register.tsx — Registers /sw.js on mount (PWA) ✅
      offline-sync.tsx            — Caches quiz/flashcard data to IndexedDB on student login ✅
      offline-queue-sync.tsx      — Processes write queue on reconnect, shows sync toast ✅
      tutorial-modal.tsx          — Spotlight tour modal (CSS box-shadow cutout); on mobile, tooltip anchored to bottom of screen ✅
      tutorial-controller.tsx     — Per-portal localStorage keys; auto-shows on first login; fires bims:open-sidebar before showing on mobile (350ms delay); fires bims:close-sidebar on close ✅
    student/
      quiz-launcher.tsx           — Full quiz engine (offline-aware: IndexedDB reads + write queue)
      flashcard-launcher.tsx      — Full flashcard engine (offline-aware: IndexedDB reads + write queue)
      exam-center-view.tsx        — Subject tab switcher, papers grouped by year, PDF open button ✅
      study-buddy-chat.tsx        — Streaming chat UI (subject pills, message thread, abort on cancel) ✅
      module-list.tsx             — Module cards with status badge (submitted/overdue/not started) ✅
      module-attempt.tsx          — Attempt UI + offline write queue for submissions ✅
      daily-challenge-view.tsx    — Daily Challenge UI (pending/completed modes, result reveal) ✅
      review-view.tsx             — Review UI (per-question check-answer, mastered badge, grouped by subject) ✅
      notifications-view.tsx      — Notification cards (subject badge, teacher name, timestamp) ✅
      study-timer-view.tsx        — Study Timer client component (SVG ring, duration/subject pickers, pause/resume, XP on complete) ✅
    teacher/
      content-manager.tsx         — Tabs: Quiz Questions / Flashcards / Topics
      student-enroller.tsx        — Per-student enrolment manager (add/remove subjects inline) ✅
      exam-center-manager.tsx     — Upload form + paper list + AI "Extract Qs" button + review panel + save to library ✅
      module-manager.tsx          — Create module, list with publish/unpublish/delete, gradebook per module ✅
    ui/                           — shadcn/ui components
  lib/
    supabase/
      client.ts                   — Browser Supabase client
      server.ts                   — Server Supabase client (uses cookies())
    progress.ts                   — Shared XP/streak/level/lessons_this_week update utility ✅
    teacher-subjects.ts           — getTeacherContext(supabase, userId) → { role, subjectIds, isAdmin } ✅
    offline-db.ts                 — IndexedDB layer (DB: bims-offline v2, stores: quiz_questions, flashcards, write_queue) ✅
  proxy.ts                        — Auth + role-based route protection; /admin/* guard; admin→/admin redirect
  types/database.ts               — Full TypeScript DB schema (manual); includes teacher_subjects, study_sessions

public/
  sw.js                           — Service worker (cache-first static, network-first navigation) ✅
  logo.png                        — School logo (confirmed working on live site) ✅

supabase-schema.sql               — Full DB schema (run once, already executed)
supabase-modules.sql              — Modules tables schema — ALREADY RUN ✅
supabase-announcements.sql        — Announcements table + RLS — already existed; no action needed ✅
supabase-daily-challenge.sql      — daily_challenge_attempts table + RLS — NOT YET RUN IN PRODUCTION ⚠️
supabase-teacher-subjects.sql     — teacher_subjects table + RLS — table + some policies ALREADY EXIST (partial run). Use DROP POLICY IF EXISTS version (see below). ⚠️ BLOCKING
supabase-admin-enroll.sql         — trigger: auto-inserts teacher_subjects rows for all subjects when role=admin — NOT YET RUN ⚠️ (run after teacher-subjects.sql)
supabase-study-timer.sql          — study_sessions table + RLS — NOT YET RUN IN PRODUCTION ⚠️ BLOCKING for XP
supabase-seed-questions.sql       — 15 sample quiz questions (IT/Business/Biology)
supabase-seed-flashcards.sql      — 24 sample flashcards (IT/Business/Biology)
supabase-migrate-geography-to-business.sql — Already run on live DB ✅
```

---

## Supabase Setup Status
- Project created and connected ✅
- Schema executed (all base tables created) ✅
- RLS enabled and policies applied to all base tables ✅
- IT, Business, Biology subjects seeded ✅ (Geography migrated to Business)
- Business questions and flashcards seeded ✅
- Auth: Email provider enabled. Email confirmation: **OFF** ✅
- Triggers: `handle_new_user` (auto-creates profile on signup) ✅
- Triggers: `handle_new_student_progress` (auto-creates user_progress row for students) ✅
- Storage bucket `past-papers`: **CREATED** as public bucket ✅
- `supabase-modules.sql`: **ALREADY RUN** ✅
- `supabase-announcements.sql`: **Already existed** ✅
- `supabase-teacher-subjects.sql`: **PARTIALLY RUN** — table + some policies exist but the full script errored with "policy already exists". Must run the DROP POLICY IF EXISTS version below. ⚠️ BLOCKING
- `supabase-admin-enroll.sql`: **NOT YET RUN** — must be run after supabase-teacher-subjects.sql. ⚠️
- `supabase-study-timer.sql`: **NOT YET RUN** ⚠️ BLOCKING for XP
- `supabase-daily-challenge.sql`: **NOT YET RUN** ⚠️ BLOCKING
- URL Configuration: **ACTION REQUIRED** — set Site URL to Vercel URL and add `/reset-password` to Redirect URLs in Supabase → Auth → URL Configuration

### DROP POLICY IF EXISTS version of supabase-teacher-subjects.sql
Run this in the Supabase SQL editor instead of the raw file:
```sql
DROP POLICY IF EXISTS "teacher_subjects_select" ON teacher_subjects;
DROP POLICY IF EXISTS "teacher_subjects_insert" ON teacher_subjects;
DROP POLICY IF EXISTS "teacher_subjects_admin_all" ON teacher_subjects;

CREATE TABLE IF NOT EXISTS teacher_subjects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id  uuid        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, subject_id)
);

ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_subjects_select"
  ON teacher_subjects FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "teacher_subjects_insert"
  ON teacher_subjects FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "teacher_subjects_admin_all"
  ON teacher_subjects FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

---

## Vercel Deployment
- Deployed and live ✅
- GitHub repo: `bims-companion_app` (private, master branch)
- Root Directory: empty (repo root is the app root — do not set a subdirectory)
- Environment variables set in Vercel: all 4 configured ✅
- Deployment Protection: **DISABLED** ✅
- To redeploy: push a new commit to master — Vercel auto-deploys

---

## Required Environment Variables (names only)
File: `.env.local` in project root (local dev only — never commit this file)
Also set in Vercel dashboard for production.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
```

**Note on Anthropic API key:** AI extraction and Study Buddy are broken in production until Anthropic billing credits are added.

---

## What Has Been Completed
- Project scaffolded with Next.js 16, TypeScript, Tailwind v4, shadcn/ui
- Supabase client (browser + server) configured
- Auth: login page, role-based redirect, proxy route guard
- Dark/light theme toggle (next-themes)
- Full student portal (quiz, flashcards, progress, leaderboard, exam centre, study buddy, modules, daily challenge, review, notifications, profile)
- Full teacher portal (content, students, exam centre, modules, analytics, messages, profile)
- Password management (change, forgot, reset)
- PWA phases 1–3 (manifest, service worker, offline reads, write queue + sync)
- Study Buddy strict guardrails
- Geography → Business migration
- Interactive onboarding tutorial (student + teacher portals)
- Teacher unit selection at signup + teacher portal scoping via getTeacherContext()
- Admin portal (/admin dashboard, users, teachers)
- Admin auto-enrollment trigger (SQL not yet run)
- Visual enhancements (login/signup blobs, student dashboard hero, stat cards, quick-link tiles)
- Study Timer (SVG ring, presets, pause/resume, XP on completion)
- **Mobile responsive sidebars** — hamburger drawer on all three portals ✅
- **Layout scroll fix** — items-start + removed flex-1 from main; all pages now scroll correctly on all screen sizes ✅
- **Tutorial fixes** — per-portal keys, mobile sidebar auto-open, bottom-anchored tooltip on mobile ✅
- TypeScript passing clean (`tsc --noEmit` no errors) ✅
- All changes committed and pushed to master ✅

---

## What Is Broken, Unknown, or Unverified
- **ACTION REQUIRED (manual, BLOCKING):** Run DROP POLICY IF EXISTS version of supabase-teacher-subjects.sql. Teacher portal broken in production.
- **ACTION REQUIRED (manual, after above):** Run supabase-admin-enroll.sql.
- **ACTION REQUIRED (manual):** Re-assign teacher unit via /admin/teachers after SQL runs.
- **ACTION REQUIRED (manual, BLOCKING for XP):** Run supabase-study-timer.sql.
- **ACTION REQUIRED (manual, BLOCKING):** Run supabase-daily-challenge.sql.
- **ACTION REQUIRED (manual):** Supabase → Auth → URL Configuration → set Site URL + add /reset-password to Redirect URLs.
- **ACTION REQUIRED (manual):** Add Anthropic billing credits.
- **UNVERIFIED:** Tutorial on mobile (sidebar auto-open + bottom tooltip) — deployed, not yet confirmed on real device.
- **UNVERIFIED:** Teacher unit assignment — teacher_subjects SQL not yet run cleanly.
- **UNVERIFIED:** Admin auto-enrollment — SQL not yet run.
- **UNVERIFIED:** Study Timer XP — SQL not yet run.
- **UNVERIFIED:** Daily Challenge end-to-end.
- **UNVERIFIED:** AI question extraction — requires Anthropic credits.
- **UNVERIFIED:** Teacher announcements / student notifications.
- **UNVERIFIED:** Review / Weak Areas with real data.
- **UNVERIFIED:** Password reset flow end-to-end (requires Supabase URL config).
- **UNVERIFIED:** PWA offline on a real device.
- **UNVERIFIED:** Modules end-to-end on live site.
- **UNVERIFIED:** Exam Centre PDF upload on live site.
- **UNVERIFIED:** Streak increment across real days.
- **Not built:** Gradebook (dedicated aggregate page — next in agreed order)
- **Not built:** Discussions (teacher/student threads per subject)
- **Not built:** Curriculum Builder (Subject → Year → Unit → Chapter → Lesson tree)
- **Not built:** Discoverability fixes (login page signup hint, teacher dashboard empty-state prompts)

---

## Original App Comparison (bims.bi — reviewed Session 2)
Key gaps remaining:
- **Gradebook** — dedicated aggregate view (next in agreed order)
- **Discussions** — teacher/student threads
- **Curriculum Builder** — structured curriculum tied to Pearson Edexcel exam board units (most-requested by teachers)
- **Student Monitor / Coverage Grid / Trends** — analytics inside the Exam Center (teacher side)
- **Classes / Study Groups / Teaching Center / Patterns / Calendar** — community and extended features

Features we have that the original does NOT: AI Study Buddy, AI question extraction from PDFs, Teacher Analytics dashboard, PWA offline support, Interactive onboarding tutorial, Admin portal, Study Timer, Mobile responsive sidebar.

The original app is built with **Vite + React** (SPA). Our app uses **Next.js** which gives faster first loads (server-rendered HTML), built-in API routes (no separate backend needed for AI/auth), and first-class Vercel deployment.

---

## Mobile Responsiveness (added this session)
All three portals are now mobile responsive:
- Sidebars: `fixed inset-y-0 left-0` on mobile, `md:relative md:translate-x-0` on desktop
- Hamburger button: `fixed top-3 left-3 z-40 md:hidden`
- Backdrop: `fixed inset-0 bg-black/50 z-40 md:hidden` — closes sidebar on tap
- Layout topbar: `pl-14 pr-4 md:px-6` — reserves space for hamburger on mobile
- Main padding: `p-4 md:p-6`
- Outer layout container: `flex items-start min-h-screen` — items-start prevents height-stretching that locked pages to 100vh
- `main`: no `flex-1` — sizes to content so page scrolls naturally

---

## Tutorial System
- **Student key:** `bims_student_tutorial_v1`
- **Teacher key:** `bims_teacher_tutorial_v1`
- Auto-shows on first login if key absent. Relaunchable from profile page ("Take the tour").
- On mobile: fires `bims:open-sidebar` custom event → sidebars open → 350ms delay → modal mounts (sidebar animation completes before element measurement).
- On close: fires `bims:close-sidebar` → sidebars close on mobile.
- Mobile tooltip: always `fixed bottom: 16, left: 8, right: 8` (full width). Desktop tooltip: positioned relative to highlighted element.
- Spotlight: CSS `box-shadow: 0 0 0 9999px rgba(0,0,0,0.65)` on a div sized to the target element.

---

## Teacher Portal Scoping
All 7 teacher pages call `getTeacherContext(supabase, userId)` from `src/lib/teacher-subjects.ts`. Returns `{ role, subjectIds, isAdmin }`. If `isAdmin`, all data shown unfiltered. If not admin, queries filtered to `subjectIds`. If `subjectIds` is empty, pages return empty data.
**NOTE:** If `teacher_subjects` table does not exist, `getTeacherContext` will error. Run the SQL first.

---

## Admin Portal Design
- `/admin` — dashboard with school-wide stats
- `/admin/users` — search and change roles; cannot change own role
- `/admin/teachers` — reassign teacher unit (writes to teacher_subjects — requires SQL to be run first)
- Admins land on `/admin` after login
- Admins can toggle to teacher portal via sidebar link
- `/admin/*` requires `role === 'admin'` in proxy.ts
- To create the first admin: Supabase → Table Editor → profiles → set `role` to `admin` manually

---

## Key Gotchas for New Sessions
1. **`as any` on inserts** — Supabase insert/update objects type as `never` with manual DB types. Always cast with `(supabase as any).from(...)`.
2. **Select `onValueChange` type** — shadcn Select passes `string | null`. Use `(v: string | null) => { if (v) setState(v) }`.
3. **`SelectValue` display** — Must pass explicit children to show the label.
4. **Role from profile** — Use `(data as any)?.role` pattern.
5. **Node PATH in PowerShell** — If `node`/`npx` not found, reload PATH: `$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")`.
6. **Anthropic SDK streaming** — `MessageStream` has no `.textStream`. Use `for await (const event of stream)` and check `event.type === 'content_block_delta' && event.delta.type === 'text_delta'`.
7. **Supabase Storage** — The `past-papers` bucket exists as a public bucket. ✅
8. **Next.js 16 dynamic params** — `params` is now a `Promise`. Always `const { id } = await params`.
9. **Vercel Root Directory** — Must be empty. The repo root is the app root.
10. **Redeploy after env var changes** — Changing env vars in Vercel Settings does not auto-redeploy.
11. **School logo** — `public/logo.png`. Use `bg-white rounded-xl p-0.5` container for dark mode.
12. **PWA manifest** — Uses Next.js 16 native `MetadataRoute.Manifest` via `src/app/manifest.ts`. Do NOT add `@ducanh2912/next-pwa`. Do NOT add `vite-plugin-pwa` (Vite plugin, incompatible with Next.js).
13. **IndexedDB** — DB name `bims-offline`, version 2, three stores: `quiz_questions`, `flashcards`, `write_queue`.
14. **Service worker** — At `public/sw.js`. Cache name `bims-v1`. Pre-caches `['/', '/login', '/offline']`.
15. **Admin access in proxy.ts** — `/admin/*` guard runs first. Then the existing role guards. `redirectByRole` sends admins to `/admin`.
16. **Public routes in proxy.ts** — Full list: `['/login', '/signup', '/forgot-password', '/reset-password', '/offline']`.
17. **Daily Challenge XP** — `progress.ts` uses the browser Supabase client and cannot be called from API routes. The Daily Challenge API route inlines the full XP logic using the server client. If the XP formula changes, update both files.
18. **Subject colours in Tailwind** — DB-stored hex colours cannot be used as Tailwind class names (purged at build time). Use inline `style={{ backgroundColor: s.color + '20', color: s.color, borderColor: s.color + '40' }}`.
19. **PowerShell `(auth)` paths** — PowerShell parses `(auth)` as a subexpression. Use `git add -u` for modified tracked files with parentheses in their paths.
20. **PowerShell heredoc** — Use `@'...'@` (single-quoted here-string) for multiline commit messages.
21. **Tutorial localStorage** — Student key: `bims_student_tutorial_v1`. Teacher key: `bims_teacher_tutorial_v1`. Auto-shows if absent. Relaunchable via `bims:launch-tutorial` custom event. Mobile sidebar opened via `bims:open-sidebar` event before modal mounts.
22. **getTeacherContext pattern** — Called at the top of every teacher page. Returns `{ role, subjectIds, isAdmin }`. Will error if `teacher_subjects` table does not exist in the DB.
23. **Mobile sidebar state** — Each sidebar manages its own `open` state. On mobile: `fixed inset-y-0 left-0 z-50`, translates off-screen when closed. On desktop: `md:relative md:translate-x-0`. Listens for `bims:open-sidebar` and `bims:close-sidebar` events.
24. **Layout scroll** — Outer container uses `flex items-start min-h-screen`. `items-start` prevents flex children from being height-locked to 100vh. `main` has no `flex-1`. Without this, content taller than the viewport is unreachable.
25. **Content Manager vs Curriculum Builder** — These are different. Content Manager (`/teacher/content`) is a form for adding MCQ questions, flashcards, and topics. Curriculum Builder (not yet built) is a structured content tree (Subject → Year → Unit → Chapter → Lesson) tied to the Pearson Edexcel specification.

---

## Exact Next Steps for Next Session
1. **CRITICAL — run in Supabase SQL editor in this order:**
   - DROP POLICY IF EXISTS version of teacher-subjects (exact SQL in CLAUDE_HANDOFF.md above)
   - `supabase-admin-enroll.sql`
   - Re-assign teacher unit via `/admin/teachers`
   - `supabase-study-timer.sql`
   - `supabase-daily-challenge.sql`
2. **Manual:** Supabase → Auth → URL Configuration → Site URL + `/reset-password` redirect.
3. **Manual:** Add Anthropic billing credits.
4. **Next feature:** Gradebook — dedicated `/teacher/gradebook` page (aggregate all students × all modules).
5. **After Gradebook:** Discoverability fixes (quick wins for teachers already using the app).

---

## Commands to Run Locally
```bash
# Start dev server
npm run dev
# → http://localhost:3000

# Type check
npx tsc --noEmit

# Push to production
git add .
git commit -m "your message"
git push
# Vercel auto-deploys on push to master
```
