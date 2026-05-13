# CLAUDE_HANDOFF.md

## App Name & Purpose
**BIMS Companion** — A-Level study platform for Year 12–13 students at BIMS School.
Subjects: IT, Business, Biology.
Three user portals: Student (study tools, XP, streaks), Teacher (content creation, student oversight, scoped to their unit), Admin (user management, school-wide view).

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
      login/page.tsx              — Login page ✅
      signup/page.tsx             — Signup page ✅
      forgot-password/page.tsx    — Sends Supabase password reset email ✅
      reset-password/page.tsx     — Handles PASSWORD_RECOVERY event ✅
    page.tsx                      — Root redirect (role-based)
    layout.tsx                    — Root layout (ThemeProvider, Toaster, ServiceWorkerRegister)
    manifest.ts                   — PWA manifest ✅
    offline/page.tsx              — Offline fallback page ✅
    api/
      study-buddy/route.ts        — POST: streams Claude Haiku, subject-only guardrails ✅
      extract-questions/route.ts  — POST: fetches PDF → Claude Sonnet → MCQ array ✅ (UNVERIFIED — needs Anthropic credits)
      daily-challenge/route.ts    — POST: server-side answer check, XP award ✅
      parse-textbook/route.ts     — POST: single-lesson PDF → Claude Sonnet → ContentBlock[] ✅
      curriculum/
        extract-outline/route.ts  — POST: PDF URL → Claude Sonnet → unit/topic/lesson outline + creates import job ✅
        generate-lesson/route.ts  — POST: PDF URL + lessonDbId → Claude Sonnet → blocks + quiz questions + flashcards saved to DB ✅
    admin/
      layout.tsx                  — Admin layout (role guard, AdminSidebar, UserMenu in topbar) ✅
      page.tsx                    — Admin dashboard (school-wide stats) ✅
      users/page.tsx              — User management: search, inline role change ✅
      teachers/page.tsx           — Teacher unit reassignment ✅
      settings/page.tsx           — Admin settings (shared SettingsView, role="admin") ✅
    student/
      layout.tsx                  — Student layout (sidebar + topbar with UserMenu + offline + TutorialController) ✅
      page.tsx                    — Student dashboard ✅
      curriculum/page.tsx         — Curriculum browser (subject tree) ✅ (UNVERIFIED — needs supabase-curriculum.sql + lesson-media bucket)
      quiz/page.tsx               — Quiz ✅
      flashcards/page.tsx         — Flashcards ✅
      exam-center/page.tsx        — Exam Centre ✅
      progress/page.tsx           — Progress analytics ✅
      leaderboard/page.tsx        — Top 25 by XP ✅
      study-buddy/page.tsx        — AI chat tutor ✅
      profile/page.tsx            — Profile page (reached via Settings) ✅
      settings/page.tsx           — Student settings hub ✅
      modules/page.tsx            — Module list ✅
      modules/[id]/page.tsx       — Module attempt page ✅
      daily-challenge/page.tsx    — Daily Challenge (+35 XP) ✅ (UNVERIFIED end-to-end with real account)
      review/page.tsx             — Review / Weak Areas ✅ (UNVERIFIED)
      notifications/page.tsx      — Student notifications ✅ (UNVERIFIED)
      study-timer/page.tsx        — Study Timer ✅ (UNVERIFIED end-to-end with real account)
    teacher/
      layout.tsx                  — Teacher layout (sidebar + topbar with UserMenu, role guard) ✅
      page.tsx                    — Teacher dashboard ✅
      curriculum/page.tsx         — Curriculum Builder tree view ✅ (UNVERIFIED — needs supabase-curriculum.sql)
      content/page.tsx            — Content Manager ✅
      students/page.tsx           — Student list ✅
      exam-center/page.tsx        — Exam Centre ✅
      modules/page.tsx            — Module manager ✅
      analytics/page.tsx          — Analytics dashboard ✅
      messages/page.tsx           — Announcement broadcast ✅ (UNVERIFIED end-to-end)
      profile/page.tsx            — Profile page (reached via Settings → Profile) ✅
      settings/page.tsx           — Teacher settings hub ✅
  components/
    layout/
      student-sidebar.tsx         — Mobile drawer; Profile link removed; Settings link covers /settings + /profile ✅
      teacher-sidebar.tsx         — Mobile drawer; Profile link removed; Settings link added ✅
      admin-sidebar.tsx           — Mobile drawer; Profile link removed; Settings link with active state ✅
    shared/
      theme-provider.tsx
      theme-toggle.tsx
      profile-form.tsx            — Profile editor + career avatar picker + photo upload + change password ✅
      user-menu.tsx               — Avatar dropdown (name/email/role, Profile, Settings, Sign out) ✅
      settings-view.tsx           — Role-aware settings hub (all 3 portals) ✅
      service-worker-register.tsx — Registers /sw.js on mount ✅
      offline-sync.tsx            — Caches quiz/flashcard data to IndexedDB on student login ✅
      offline-queue-sync.tsx      — Processes write queue on reconnect ✅
      tutorial-modal.tsx          — Spotlight tour modal ✅
      tutorial-controller.tsx     — Per-portal localStorage keys; mobile sidebar auto-open ✅
    student/
      quiz-launcher.tsx           — Full quiz engine; shows lesson review cards on wrong answers ✅
      flashcard-launcher.tsx      — Full flashcard engine ✅
      curriculum-view.tsx         — Curriculum browser + lesson reader (all 9 block types) ✅ (UNVERIFIED)
      exam-center-view.tsx        — Subject tab switcher, papers grouped by year ✅
      study-buddy-chat.tsx        — Streaming chat UI ✅
      module-list.tsx             — Module cards with status badge ✅
      module-attempt.tsx          — Attempt UI + offline write queue ✅
      daily-challenge-view.tsx    — Daily Challenge UI ✅
      review-view.tsx             — Review UI ✅
      notifications-view.tsx      — Notification cards ✅
      study-timer-view.tsx        — Study Timer (SVG ring, XP on complete) ✅
      settings-view.tsx           — Re-export of shared/settings-view.tsx ✅
    teacher/
      curriculum-builder.tsx      — Tree view (Unit → Topic → Lesson) with full CRUD; "Import Textbook" / "Resume Import" buttons per subject ✅ (UNVERIFIED)
      lesson-editor.tsx           — Block-based lesson editor (9 block types, media upload, linked resources, "Import from PDF" button) ✅ (UNVERIFIED)
      textbook-import-wizard.tsx  — Multi-step wizard: upload PDF → extract outline → review/edit tree → generate all lessons with resume support ✅ (UNVERIFIED — needs supabase-curriculum-import.sql + Anthropic credits)
      content-manager.tsx         — Quiz questions / Flashcards / Topics tabs ✅
      student-enroller.tsx        — Per-student enrolment manager ✅
      exam-center-manager.tsx     — Upload form + AI "Extract Qs" + save to library ✅
      module-manager.tsx          — Create module, gradebook per module ✅
    ui/                           — shadcn/ui components (no Switch component — use custom Toggle in settings-view)
  lib/
    supabase/
      client.ts                   — Browser Supabase client
      server.ts                   — Server Supabase client
    career-avatars.ts             — 14 career SVG avatar definitions + helper functions ✅
    progress.ts                   — XP/streak/level/lessons_this_week update utility ✅
    teacher-subjects.ts           — getTeacherContext(supabase, userId) → { role, subjectIds, isAdmin } ✅
    offline-db.ts                 — IndexedDB layer (bims-offline v2) ✅
  proxy.ts                        — Auth + role-based route protection; manifest.webmanifest + sw.js excluded ✅
  types/database.ts               — Full TypeScript DB schema; includes curriculum tables + ContentBlock union ✅

public/
  sw.js                           — Service worker (cache-first static, network-first navigation) ✅
  logo.png                        — School logo ✅

supabase-schema.sql               — Full base DB schema (already run) ✅
supabase-modules.sql              — Modules tables (already run) ✅
supabase-announcements.sql        — Announcements table (already run) ✅
supabase-teacher-subjects.sql     — teacher_subjects table — ALREADY RUN ✅
supabase-admin-enroll.sql         — Admin auto-enrollment trigger — ALREADY RUN ✅
supabase-study-timer.sql          — study_sessions table — ALREADY RUN ✅
supabase-daily-challenge.sql      — daily_challenge_attempts table — ALREADY RUN ✅
supabase-migrate-geography-to-business.sql — Already run ✅
supabase-curriculum.sql           — Curriculum tables (4 new) + migrations — NOT YET RUN ⚠️ BLOCKING
supabase-curriculum-import.sql    — curriculum_import_jobs table + RLS — NOT YET RUN ⚠️ BLOCKING for Textbook Import Wizard
```

---

## Supabase Setup Status
- Base schema, RLS, auth triggers all executed ✅
- IT, Business, Biology subjects seeded ✅
- `supabase-teacher-subjects.sql` (DROP POLICY IF EXISTS version) — **ALREADY RUN** ✅
- `supabase-admin-enroll.sql` — **ALREADY RUN** ✅
- `supabase-study-timer.sql` — **ALREADY RUN** ✅
- `supabase-daily-challenge.sql` — **ALREADY RUN** ✅
- `supabase-curriculum.sql` — **NOT YET RUN** ⚠️ BLOCKING for Curriculum Builder
- `supabase-curriculum-import.sql` — **NOT YET RUN** ⚠️ BLOCKING for Textbook Import Wizard
- Storage bucket `past-papers` — public bucket exists ✅
- Storage bucket `avatars` — **MUST EXIST** for photo upload; create as public bucket if not present. RLS policies for INSERT/UPDATE/SELECT also required ⚠️ (UNVERIFIED if applied)
- Storage bucket `lesson-media` — **NOT YET CREATED** ⚠️ BLOCKING for image/file uploads in lessons
- Auth: Email confirmation OFF ✅
- Supabase → Auth → URL Configuration — **ACTION REQUIRED:** set Site URL + add `/reset-password` to Redirect URLs ⚠️

---

## Vercel Deployment
- Deployed and live ✅
- GitHub repo: `bims-companion_app` (private, master branch)
- Root Directory: empty (repo root is the app root)
- Environment variables: all 4 set ✅
- Deployment Protection: disabled ✅
- To redeploy: push to master — Vercel auto-deploys

---

## Required Environment Variables
File: `.env.local` in project root (local dev only — never commit)
Also set in Vercel dashboard for production.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
```

**Note:** AI features (Study Buddy, question extraction) are broken in production until Anthropic billing credits are added.

---

## What Has Been Completed
- Project scaffolded: Next.js 16, TypeScript, Tailwind v4, shadcn/ui
- Supabase client (browser + server), auth, role-based redirect, proxy route guard
- Dark/light theme toggle
- Full student portal (quiz, flashcards, progress, leaderboard, exam centre, study buddy, modules, daily challenge, review, notifications, study timer, profile)
- Full teacher portal (content, students, exam centre, modules, analytics, messages, profile)
- Admin portal (dashboard, users, teachers)
- Password management (change, forgot, reset)
- PWA phases 1–3 (manifest, service worker, offline reads, write queue + sync)
- Study Buddy strict subject guardrails
- Interactive onboarding tutorial (student + teacher portals)
- Teacher unit selection at signup + portal scoping via getTeacherContext()
- Admin auto-enrollment trigger
- Visual enhancements (login/signup blobs, student dashboard hero, stat cards, quick-link tiles)
- Study Timer (SVG ring, presets, XP on completion)
- Mobile responsive sidebars on all three portals
- Layout scroll fix (items-start + no flex-1 on main)
- Tutorial fixes (per-portal keys, mobile sidebar auto-open, bottom-anchored tooltip)
- **Curriculum Builder** — Unit → Topic → Lesson tree with full CRUD; lesson editor with 9 block types; image/file upload to lesson-media bucket; publish/draft toggle; linked resources ✅ (committed, pushed — UNVERIFIED in production)
- **Student Curriculum View** — browse tree, lesson reader (all block types rendered), progress tracking ✅ (UNVERIFIED in production)
- **Quiz launcher lesson recommendations** — wrong answers with linked lesson surface "Review this lesson" cards ✅
- **proxy.ts manifest fix** — PWA installability unblocked ✅
- **Textbook Import Wizard** — AI-driven full curriculum generation from PDF; resume-on-failure support ✅ (committed, pushed — UNVERIFIED: needs SQL + Anthropic credits)
- **Per-lesson PDF import** — "Import from PDF" in Lesson Editor ✅ (UNVERIFIED: needs Anthropic credits)
- **Universal settings system** — `src/components/shared/settings-view.tsx` serves all three portals with role-aware sections: Appearance (3-way theme), Audio, Preferences, App Settings (PWA install prompt, haptic feedback, tutorial reset), Region, Help, About ✅ (committed, pushed — UNVERIFIED in teacher/admin portals)
- **UserMenu dropdown** — avatar in all three layout topbars opens a dropdown: name, email, role badge, Profile link, Settings link, Sign out. Custom click-outside implementation ✅
- **Career avatar system** — 14 in-app SVG career avatars (doctor, engineer, teacher, pilot, lawyer, scientist, artist, chef, athlete, programmer, entrepreneur, nurse, architect, vet). Stored as `bims-career:<id>` in `avatar_url`. `resolveAvatarSrc()` converts to SVG data URI at render time — no storage bucket needed ✅ (committed, pushed — UNVERIFIED rendering in production)
- **Profile avatar picker** — inline career grid + custom photo upload in ProfileForm ✅ (photo upload UNVERIFIED — depends on avatars bucket RLS)
- **Sidebar consolidation** — Profile link removed from all three sidebars; Settings link is the single entry point with active state covering both /settings and /profile paths ✅
- TypeScript passing clean (`tsc --noEmit` no errors) ✅
- All changes committed and pushed to master ✅

---

## What Is Broken, Unknown, or Unverified
- **ACTION REQUIRED (manual, BLOCKING for photo upload):** Run avatars bucket RLS policies in Supabase SQL Editor. See TODO.md for the exact SQL.
- **ACTION REQUIRED (manual, BLOCKING for Curriculum):** Run `supabase-curriculum.sql` in Supabase SQL Editor.
- **ACTION REQUIRED (manual, BLOCKING for Textbook Import Wizard):** Run `supabase-curriculum-import.sql` in Supabase SQL Editor.
- **ACTION REQUIRED (manual, BLOCKING for lesson media):** Create `lesson-media` bucket in Supabase → Storage → New bucket → Name: `lesson-media` → Public: YES.
- **ACTION REQUIRED (manual):** Supabase → Auth → URL Configuration → set Site URL + add `/reset-password` to Redirect URLs.
- **ACTION REQUIRED (manual):** Add Anthropic billing credits.
- **UNVERIFIED:** Career avatar rendering in production — built and deployed but not visually confirmed.
- **UNVERIFIED:** Custom photo upload end-to-end — avatars bucket RLS may not yet be applied.
- **UNVERIFIED:** Settings page in teacher and admin portals — built, deployed, not manually verified.
- **UNVERIFIED:** Curriculum Builder end-to-end — SQL not yet run, lesson-media bucket not yet created.
- **UNVERIFIED:** Textbook Import Wizard — `supabase-curriculum-import.sql` not yet run, Anthropic credits required.
- **UNVERIFIED:** Teacher unit assignment with real teacher account.
- **UNVERIFIED:** Admin auto-enrollment — not confirmed with real login.
- **UNVERIFIED:** Study Timer XP end-to-end.
- **UNVERIFIED:** Daily Challenge end-to-end.
- **UNVERIFIED:** Tutorial on mobile (sidebar auto-open + bottom tooltip).
- **UNVERIFIED:** AI question extraction — requires Anthropic credits.
- **UNVERIFIED:** Teacher announcements / student notifications end-to-end.
- **UNVERIFIED:** Review / Weak Areas with real data.
- **UNVERIFIED:** Password reset flow end-to-end (requires Supabase URL config).
- **UNVERIFIED:** PWA offline on a real device.
- **UNVERIFIED:** Modules end-to-end on live site.
- **UNVERIFIED:** Exam Centre PDF upload on live site.
- **UNVERIFIED:** Streak increment across real days.
- **Not built:** Notes on lessons (per-lesson student note-taking)
- **Not built:** Search (across lessons, questions, flashcards)
- **Not built:** Achievements page
- **Not built:** Revision plans
- **Not built:** Discussions

---

## Original App Comparison
Key gaps remaining (updated 2026-05-13):
- **Notes** — per-lesson student note-taking
- **Search** — across curriculum, questions, flashcards
- **Achievements page** — surface XP milestones, streak records, perfect scores
- **Revision plans** — teacher builds a pre-exam lesson sequence
- **Discussions** — teacher/student threads per subject

Features we have that the original does NOT: AI Study Buddy, AI question extraction from PDFs, Teacher Analytics dashboard, PWA offline support, Interactive onboarding tutorial, Admin portal, Study Timer, Mobile responsive sidebar, Curriculum Builder with rich block-based lessons, Career avatar picker, Universal settings system, UserMenu dropdown.

Features confirmed out of scope (deliberate decision): super-admin, parent portal, staff views, director reporting, virtual classroom. These are not needed for a single-school deployment.

---

## Settings System (added 2026-05-13)

### Architecture
- Single shared component: `src/components/shared/settings-view.tsx`
- Props: `{ role: 'student' | 'teacher' | 'admin', basePath: string }`
- `basePath` drives all navigation: Profile → `${basePath}/profile`, etc.
- Admin uses `basePath="/teacher"` (shares teacher profile page)
- Student-only sections: leaderboard privacy, streak reminders, study timer link

### Sections
| Section | Content |
|---|---|
| Appearance | Light / Dark / System 3-way theme toggle |
| Audio | Notification sounds toggle, Sound effects toggle (localStorage) |
| Preferences | Leaderboard privacy (student only), Streak reminders (student only) |
| App Settings | PWA install prompt (beforeinstallprompt), Haptic feedback toggle (navigator.vibrate), Tutorial reset |
| Region | Timezone display (auto-detected, read-only label) |
| Help & Support | Contact info placeholders |
| About | App version, role label |

### Custom Toggle
No `Switch` in `src/components/ui/`. Settings uses a custom inline `Toggle` component (button with `role="switch"`, sliding span). Not extracted to ui/ — stays inside settings-view.tsx.

### Storage
All toggles persist in localStorage:
- `bims_notification_sounds`
- `bims_sound_effects`
- `bims_haptic_feedback`
- `bims_leaderboard_visible`
- `bims_streak_reminders`
- `bims_browser_notifs`

---

## Career Avatar System (added 2026-05-13)

### Storage Scheme
`avatar_url = "bims-career:doctor"` → resolved to SVG data URI at render time via `resolveAvatarSrc()`.
No additional DB column. No storage bucket required for career avatars.

### Helper Functions (src/lib/career-avatars.ts)
- `isCareerAvatar(url)` — returns true if url starts with `bims-career:`
- `careerAvatarUrl(id)` — returns `bims-career:${id}`
- `getCareerIdFromUrl(url)` — strips prefix, returns id
- `getCareerSvgString(id)` — returns full SVG string
- `getCareerDataUri(id)` — returns `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
- `resolveAvatarSrc(url)` — handles all three cases: null → null, career → data URI, custom → pass through

### 14 Career Avatars
doctor (blue), engineer (orange), teacher (purple), pilot (sky blue), lawyer (navy), scientist (emerald), artist (pink), chef (red), athlete (amber), programmer (slate), entrepreneur (teal), nurse (rose), architect (indigo), vet (lime)

### Rendering Pattern
All places that display an avatar use `resolveAvatarSrc(avatarUrl)` before passing to `AvatarImage src`. UserMenu and ProfileForm both follow this pattern.

---

## UserMenu Dropdown (added 2026-05-13)

### Why Custom (not base-ui DropdownMenu)
`src/components/ui/dropdown-menu.tsx` uses `@base-ui/react/menu` with `w-(--anchor-width)` CSS variable — sets popup width equal to the trigger (the 32px avatar button). Fighting CSS specificity to override was fragile.

### Implementation
`src/components/shared/user-menu.tsx` — `useRef<HTMLDivElement>` + `useEffect` mousedown listener for click-outside detection. Dropdown anchored `right-0 top-full mt-2`.

### Props
```typescript
{ name, email, initials, role, avatarUrl, settingsHref, profileHref }
```

### Integration
All three layouts (`student/layout.tsx`, `teacher/layout.tsx`, `admin/layout.tsx`) fetch `avatar_url` from profiles and pass it to `<UserMenu>`.

---

## Curriculum Builder (added previously)

### Data Model
```
Subject (existing)
  └── curriculum_units     — year_group: 'Year 12' | 'Year 13' | 'Both'
        └── curriculum_topics
              └── curriculum_lessons  — content: ContentBlock[] (JSONB), is_published bool
                    ├── learning_outcomes: text[]
                    └── linked quiz_questions + flashcards (via lesson_id FK)
lesson_progress             — per student per lesson: is_completed, manually_completed
```

### Content Block Types
`text | heading | image | video | table | list | callout | divider | file`

### RLS Summary
- Teachers: full CRUD on units/topics/lessons for their subject(s). Admins see all.
- Students: SELECT only, `is_published = true` AND enrolled in the subject.
- lesson_progress: students own their rows; teachers can read all.

### Storage
- Bucket: `lesson-media` (must be created manually as public bucket)

---

## Mobile Responsiveness
All three portals are mobile responsive:
- Sidebars: `fixed inset-y-0 left-0` on mobile, `md:relative md:translate-x-0` on desktop
- Hamburger: `fixed top-3 left-3 z-40 md:hidden`
- Backdrop: `fixed inset-0 bg-black/50 z-40 md:hidden`
- Layout topbar: `pl-14 pr-4 md:px-6`
- Outer container: `flex items-start min-h-screen` — items-start prevents height-lock
- `main`: no `flex-1`

---

## Tutorial System
- **Student key:** `bims_student_tutorial_v1`
- **Teacher key:** `bims_teacher_tutorial_v1`
- Auto-shows on first login. Relaunchable from Settings → App Settings → Tutorial.
- Mobile: fires `bims:open-sidebar` → 350ms delay → modal mounts.
- On close: fires `bims:close-sidebar`.
- Mobile tooltip: always `fixed bottom: 16, left: 8, right: 8`.

---

## Teacher Portal Scoping
All teacher pages call `getTeacherContext(supabase, userId)` → `{ role, subjectIds, isAdmin }`.
If `isAdmin`, all data shown unfiltered. If not admin, filtered to `subjectIds`.

---

## Admin Portal
- `/admin` — school-wide stats
- `/admin/users` — search + role changes
- `/admin/teachers` — reassign teacher subject
- `/admin/settings` — admin settings (uses shared SettingsView with basePath="/teacher")
- Admins land on `/admin` after login; can also visit teacher and student portals
- First admin: set `role = 'admin'` manually in Supabase → profiles table

---

## Key Gotchas for New Sessions
1. **`as any` on inserts** — Supabase insert/update types resolve to `never`. Always `(supabase as any).from(...)`.
2. **Select `onValueChange` type** — shadcn Select passes `string | null`. Use `(v: string | null) => { if (v) setState(v) }`.
3. **`SelectValue` display** — Must pass explicit children to show the label.
4. **Role from profile** — Use `(data as any)?.role` pattern.
5. **Node PATH in PowerShell** — `$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")`.
6. **Anthropic SDK streaming** — `MessageStream` has no `.textStream`. Use `for await (const event of stream)` and check `event.type === 'content_block_delta' && event.delta.type === 'text_delta'`.
7. **Supabase Storage** — `past-papers` bucket exists as public. `avatars` bucket must exist as public with INSERT/UPDATE/SELECT RLS policies. `lesson-media` bucket must be created manually.
8. **Next.js 16 dynamic params** — `params` is a `Promise`. Always `const { id } = await params`.
9. **Vercel Root Directory** — Must be empty.
10. **Redeploy after env var changes** — Changing env vars in Vercel does not auto-redeploy.
11. **School logo** — `public/logo.png`. Use `bg-white rounded-xl p-0.5` container for dark mode.
12. **PWA manifest** — Uses Next.js 16 native `MetadataRoute.Manifest` via `src/app/manifest.ts`. Do NOT add `@ducanh2912/next-pwa` or `vite-plugin-pwa`.
13. **IndexedDB** — DB name `bims-offline`, version 2, three stores: `quiz_questions`, `flashcards`, `write_queue`.
14. **Service worker** — `public/sw.js`. Cache name `bims-v1`. Pre-caches `['/', '/login', '/offline']`.
15. **Admin access in proxy.ts** — `/admin/*` guard runs first. `redirectByRole` sends admins to `/admin`.
16. **Public routes in proxy.ts** — Full list: `['/login', '/signup', '/forgot-password', '/reset-password', '/offline']`. `manifest.webmanifest` and `sw.js` are excluded via the matcher regex.
17. **Daily Challenge XP** — `progress.ts` uses the browser Supabase client. The Daily Challenge API route inlines XP logic using the server client. If the XP formula changes, update both.
18. **Subject colours in Tailwind** — DB-stored hex colours cannot be Tailwind class names. Use inline `style={{ backgroundColor: s.color + '20', ... }}`.
19. **PowerShell `(auth)` paths** — Use `git add -u` for modified tracked files with parentheses in paths.
20. **PowerShell heredoc** — Use `@'...'@` (single-quoted) for multiline strings. Closing `'@` must be at column 0.
21. **Tutorial localStorage** — Student: `bims_student_tutorial_v1`. Teacher: `bims_teacher_tutorial_v1`. Relaunchable via `bims:launch-tutorial` event (now triggered from Settings → App Settings, not the Profile page directly).
22. **getTeacherContext pattern** — Called at the top of every teacher page. Will error if `teacher_subjects` table does not exist.
23. **Mobile sidebar state** — Each sidebar listens for `bims:open-sidebar` and `bims:close-sidebar` events.
24. **Layout scroll** — Outer container uses `flex items-start min-h-screen`. `items-start` is critical.
25. **Content Manager vs Curriculum Builder** — Content Manager adds individual MCQ questions/flashcards/topics. Curriculum Builder structures them into a Subject → Unit → Topic → Lesson hierarchy.
26. **ContentBlock is a discriminated union** — Always switch on `block.type` before accessing type-specific fields. JSONB in DB, `ContentBlock[]` in TypeScript. Cast as `any` when inserting (Supabase JSONB column).
27. **Curriculum lesson RLS** — Teachers see all lessons for their subject regardless of `is_published`. Students only see `is_published = true` AND enrolled subject. Two separate policies, OR'd by Postgres.
28. **Lesson resource links** — Linking a question/flashcard to a lesson writes `lesson_id` on the `quiz_questions`/`flashcards` row. The linked resources tab in the lesson editor loads lazily and saves on lesson save — not in real time.
29. **proxy.ts matcher** — The regex excludes `favicon.ico`, `sw.js`, `manifest.webmanifest`, and common image extensions. Any new public static file must be added to this regex.
30. **Textbook import PDF size limit** — Vercel serverless functions have a ~4.5MB request body limit. Never send base64 PDF to an API route directly. Upload to Supabase Storage first, then pass the public URL to API routes which fetch it server-side.
31. **curriculum_import_jobs resume pattern** — Outline is stored as JSONB with per-lesson `status: 'pending' | 'done' | 'failed'`. Generation loop checks `lesson.status === 'done'` and skips.
32. **generate-lesson maxDuration** — Both `/api/curriculum/extract-outline` and `/api/curriculum/generate-lesson` set `export const maxDuration = 120`. Required for long-running Claude Sonnet PDF calls on Vercel.
33. **flashcards/quiz_questions lesson_id** — When the import wizard inserts AI-generated questions and flashcards, it sets `lesson_id` to link them to the lesson.
34. **No Switch in ui/** — `src/components/ui/` does NOT have `switch.tsx`. Settings uses a custom inline `Toggle` component defined in `settings-view.tsx`. Do not try to import Switch from shadcn.
35. **Career avatar storage scheme** — `avatar_url = "bims-career:<id>"` (not a URL). `resolveAvatarSrc()` must be called before passing to `AvatarImage src`. Never pass `bims-career:*` directly as an `<img src>`.
36. **avatars bucket RLS** — The bucket must be public AND have separate INSERT, UPDATE, SELECT policies on `storage.objects`. Without the INSERT policy, uploads fail silently with a generic error. Check `pg_policies WHERE tablename = 'objects'` to verify.
37. **base-ui DropdownMenu width** — `dropdown-menu.tsx` sets `w-(--anchor-width)` which locks popup width to the trigger element width. Do not use it for small triggers (like avatar buttons). Use a custom dropdown with `useRef` + `useEffect` mousedown listener instead.
38. **Admin settings basePath** — Admin settings uses `basePath="/teacher"` so that Profile link navigates to `/teacher/profile` (admins share the teacher profile page).

---

## Exact Next Steps for Next Session
1. **CRITICAL — run in Supabase SQL editor:**
   - avatars bucket RLS policies (see TODO.md for exact SQL)
   - `supabase-curriculum.sql`
   - `supabase-curriculum-import.sql`
2. **CRITICAL — manual in Supabase → Storage:**
   - Create bucket `lesson-media` → Public: YES
   - Verify `avatars` bucket exists as public
3. **Manual:** Supabase → Auth → URL Configuration → Site URL + `/reset-password` redirect.
4. **Manual:** Add Anthropic billing credits (console.anthropic.com → Billing).
5. **Verify:** Career avatar picker renders correctly on the profile page in production.
6. **Verify:** Custom photo upload works after RLS fix.
7. **Test:** Curriculum Builder end-to-end, then Textbook Import Wizard with a real PDF.
8. **Next feature:** Notes on lessons — per-lesson student note-taking.

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

---

## OpenAI Codex Collaboration Notes
Codex and Claude Code can work the same repo simultaneously via separate Git branches.

**Rules:**
- Never assign overlapping files to both agents at the same time
- Assign Codex well-scoped, self-contained features with full context in the prompt
- Always point Codex at `CLAUDE_HANDOFF.md` and `TODO.md` first
- Include relevant gotchas from the list above in the Codex task brief
- Paste Codex PRs into a Claude Code session for review before merging
- Claude Code reviews for: TypeScript correctness, Supabase patterns (`as any`), proxy.ts conventions, existing component reuse
