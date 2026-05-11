# CLAUDE_HANDOFF.md

## App Name & Purpose
**BIMS Companion** — A-Level study platform for Year 12–13 students at BIMS School.
Subjects: IT, Business, Biology.
Two user portals: Student (study tools, XP, streaks) and Teacher (content creation, student oversight).
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
      login/page.tsx              — Login page (email + password, "Forgot password?" link) ✅
      signup/page.tsx             — Signup page (name, email, password, role, subject selection) ✅
      forgot-password/page.tsx    — Sends Supabase password reset email ✅
      reset-password/page.tsx     — Handles PASSWORD_RECOVERY event, sets new password ✅
    page.tsx                      — Root redirect (role-based)
    layout.tsx                    — Root layout (ThemeProvider, Toaster, ServiceWorkerRegister)
    manifest.ts                   — PWA manifest (Next.js 16 native MetadataRoute.Manifest) ✅
    offline/page.tsx              — Offline fallback page ✅
    api/
      study-buddy/route.ts        — POST route: streams Claude Haiku, strict subject-only guardrails ✅
      extract-questions/route.ts  — POST route: fetches PDF, sends to Claude Sonnet, returns MCQ array ✅ (UNVERIFIED — needs Anthropic credits)
      daily-challenge/route.ts    — POST route: server-side answer check, XP award, inserts attempt ✅ (UNVERIFIED — needs supabase-daily-challenge.sql run first)
    student/
      layout.tsx                  — Student layout (sidebar + topbar + OfflineSync + OfflineQueueSync + TutorialController)
      page.tsx                    — Student dashboard (XP, streak, tiles, Daily Challenge quick link) ✅
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
    teacher/
      layout.tsx                  — Teacher layout (sidebar + topbar, role guard + TutorialController)
      page.tsx                    — Teacher dashboard (stats, quick actions) ✅
      content/page.tsx            — Content manager (quiz Qs, flashcards, topics) ✅
      students/page.tsx           — Student list with XP/streak/quiz stats + enrolment manager ✅
      exam-center/page.tsx        — Exam Centre (upload PDFs, list all papers, AI extraction) ✅
      modules/page.tsx            — Module manager (create, publish, gradebook) ✅
      analytics/page.tsx          — Analytics dashboard (summary stats, per-subject, top performers, recent activity) ✅
      messages/page.tsx           — Announcement broadcast (send to subject group or all) ✅ (UNVERIFIED end-to-end)
      profile/page.tsx            — Profile page (edit display name) ✅
  components/
    layout/
      student-sidebar.tsx         — Logo, nav links with data-tutorial attributes; includes Daily Challenge, Review, Notifications ✅
      teacher-sidebar.tsx         — Logo, nav links with data-tutorial attributes ✅
    shared/
      theme-provider.tsx
      theme-toggle.tsx
      profile-form.tsx            — Shared profile editor + change password + "Take the tour" relaunch button ✅
      service-worker-register.tsx — Registers /sw.js on mount (PWA) ✅
      offline-sync.tsx            — Caches quiz/flashcard data to IndexedDB on student login ✅
      offline-queue-sync.tsx      — Processes write queue on reconnect, shows sync toast ✅
      tutorial-modal.tsx          — Spotlight tour modal (CSS box-shadow cutout, animated ring) ✅ (UNVERIFIED on real device)
      tutorial-controller.tsx     — Auto-shows on first login, listens for bims:launch-tutorial event ✅
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
    teacher/
      content-manager.tsx         — Tabs: Quiz Questions / Flashcards / Topics
      student-enroller.tsx        — Per-student enrolment manager (add/remove subjects inline) ✅
      exam-center-manager.tsx     — Upload form + paper list + AI "Extract Qs" button + review panel + save to library ✅
      module-manager.tsx          — Create module, list with publish/unpublish/delete, gradebook per module ✅
      messages-manager.tsx        — Compose form (audience: all/subject), sent history, delete ✅
    ui/                           — shadcn/ui components
  lib/
    supabase/
      client.ts                   — Browser Supabase client
      server.ts                   — Server Supabase client (uses cookies())
    progress.ts                   — Shared XP/streak/level/lessons_this_week update utility ✅
    offline-db.ts                 — IndexedDB layer (DB: bims-offline v2, stores: quiz_questions, flashcards, write_queue) ✅
  proxy.ts                        — Auth + role-based route protection (admin bypasses all role guards)
  types/database.ts               — Full TypeScript DB schema (manual, not generated); includes announcements table

public/
  sw.js                           — Service worker (cache-first static, network-first navigation) ✅
  logo.png                        — School logo (confirmed working on live site) ✅

supabase-schema.sql               — Full DB schema (run once, already executed)
supabase-modules.sql              — Modules tables schema — ALREADY RUN ✅
supabase-announcements.sql        — Announcements table + RLS — table already existed in DB; RLS policies already existed ✅
supabase-daily-challenge.sql      — daily_challenge_attempts table + RLS — NOT YET RUN IN PRODUCTION ⚠️
supabase-seed-questions.sql       — 15 sample quiz questions (IT/Business/Biology)
supabase-seed-flashcards.sql      — 24 sample flashcards (IT/Business/Biology)
supabase-migrate-geography-to-business.sql — Already run on live DB ✅
```

---

## Supabase Setup Status
- Project created and connected ✅
- Schema executed (all 11 base tables created) ✅
- RLS enabled and policies applied to all base tables ✅
- IT, Business, Biology subjects seeded ✅ (Geography migrated to Business)
- Business questions and flashcards seeded ✅
- Auth: Email provider enabled. Email confirmation: **OFF** (confirmed by user) ✅
- Triggers: `handle_new_user` (auto-creates profile on signup) ✅ — verified working in production
- Triggers: `handle_new_student_progress` (auto-creates user_progress row for students) ✅
- Storage bucket `past-papers`: **CREATED** as public bucket ✅
- `supabase-modules.sql`: **ALREADY RUN** — modules, module_questions, module_submissions tables exist in live DB ✅
- `supabase-announcements.sql`: **Table and RLS policies already existed** in live DB when run — no action needed ✅
- `supabase-daily-challenge.sql`: **NOT YET RUN** — `daily_challenge_attempts` table does not exist in production. Daily Challenge will 500 until this SQL is run. ⚠️
- URL Configuration: **ACTION REQUIRED** — set Site URL to Vercel URL and add `/reset-password` to Redirect URLs in Supabase → Auth → URL Configuration (needed for password reset flow)

---

## Vercel Deployment
- Deployed and live ✅
- GitHub repo: `bims-companion_app` (private, master branch)
- Root Directory: empty (repo root is the app root — do not set a subdirectory)
- Environment variables set in Vercel: all 4 configured ✅
- Deployment Protection: **DISABLED** ✅ (so external users like school owner can access the URL without Vercel login)
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

**Note on Anthropic API key:** Currently using a personal Anthropic account. For production school use, create a dedicated school account at console.anthropic.com, generate a new key, and swap it in Vercel → Settings → Environment Variables → Redeploy. **AI extraction and Study Buddy are broken in production until Anthropic billing credits are added.**

---

## What Has Been Completed
- Project scaffolded with Next.js 16, TypeScript, Tailwind v4, shadcn/ui
- Supabase client (browser + server) configured
- Auth: login page, role-based redirect, proxy route guard
- Dark/light theme toggle (next-themes)
- Student portal: layout, sidebar, dashboard with XP/streak/level/weekly goal cards, read-only subject badges
- Student quiz: subject + topic selector, MCQ engine, answer reveal, explanation, XP reward, results screen
- Student flashcards: subject + topic selector, 3D CSS flip animation, confidence buttons, spaced repetition scheduling, XP reward
- Student progress page: level/XP progress bar, stat cards (streak, weekly goal, quizzes, subjects), per-subject average score bars, recent quiz history table (last 8 attempts)
- Student leaderboard: top 25 by XP, gold/silver/bronze medals, current user highlighted with "(you)"
- Student exam centre: lists past papers for enrolled subjects, grouped by year, opens PDF in new tab
- Student study buddy: subject-aware AI chat using Claude Haiku, streaming responses, subject pill selector, strict subject-only guardrails
- Student profile page: edit display name, read-only email/role, enrolled subjects list, change password card, "Take the tour" relaunch button
- Student modules: list published modules with status badges, full attempt UI (one-at-a-time, prev/next, reveal, submit), results screen with per-question review, XP earned
- Student daily challenge: one question per day (deterministic by date hash), +35 XP correct / +5 XP participation, one attempt per day enforced server-side, sidebar link + dashboard tile ✅ *(UNVERIFIED — supabase-daily-challenge.sql not yet run)*
- Student review / weak areas: surfaces recently-wrong questions from last 40 attempts, inline check-answer practice, mastered badge on correct, grouped by subject ✅ *(UNVERIFIED on live site)*
- Student notifications: lists teacher announcements filtered by enrolled subjects + global announcements ✅ *(UNVERIFIED on live site)*
- Teacher portal: layout, sidebar, dashboard with stats
- Teacher content manager: create quiz questions, flashcards, topics — all saved to Supabase
- Teacher students page: lists all students with XP/streak/quiz stats, subject pills, per-student enrolment manager
- Teacher exam centre: upload PDFs to Supabase Storage (`past-papers` bucket), save record to DB, list all papers, delete, AI "Extract Qs" button extracts MCQs via Claude Sonnet, review panel with topic picker, save extracted questions to Content Library ✅ *(AI extraction UNVERIFIED — needs Anthropic credits)*
- Teacher modules: create modules with question picker, publish/unpublish, delete, on-demand gradebook per module
- Teacher analytics: summary stats (total attempts, avg score, active this week, total XP), per-subject breakdown with progress bars, top performers list, recent quiz activity feed
- Teacher messages: compose announcements (audience: all students or specific subject), sent history with delete ✅ *(UNVERIFIED end-to-end)*
- Teacher profile page: edit display name, read-only email/role
- Both sidebars: school logo, nav links with `data-tutorial` attributes for spotlight tour, highlights on active route
- Interactive onboarding tutorial: CSS box-shadow spotlight that highlights sidebar nav elements, animated ring, tooltip card, auto-shows on first login (localStorage `bims_tutorial_v1`), relaunchable from Profile → "Take the tour" button (dispatches `bims:launch-tutorial` custom event), student 11-step tour + teacher 8-step tour ✅ *(UNVERIFIED on real device)*
- `StudentEnroller` component: teachers expand a panel per student to add/remove subject enrolments
- Signup page: collects name, email, password, role, subject selection (students only); enrols student in selected subjects after signup — **verified working in production** ✅
- `src/lib/progress.ts`: shared utility that handles XP, level, streak, and `lessons_this_week` in one atomic DB update
- Subject changed from Geography to Business across all code and live database
- TypeScript passing clean (`tsc --noEmit` no errors) ✅
- Deployed to Vercel ✅
- School logo: `public/logo.png` — confirmed working on live site ✅
- Forgot password page (`/forgot-password`): sends Supabase reset email ✅
- Reset password page (`/reset-password`): handles `PASSWORD_RECOVERY` event, sets new password ✅
- Password change on profile page: logged-in users can change password without email flow ✅
- Admin access: admin role bypasses all role guards in `proxy.ts`, lands on `/teacher` after login, can freely access both student and teacher portals ✅
- Study Buddy guardrails: strict system prompt — subject-only, refuses off-topic with fixed message, ignores persona changes/prompt injection ✅
- PWA Phase 1: `src/app/manifest.ts` (native Next.js 16 manifest), `public/sw.js` (service worker), `src/app/offline/page.tsx`, `src/components/shared/service-worker-register.tsx` — app is installable to home screen ✅
- PWA Phase 2: `src/lib/offline-db.ts` (IndexedDB, DB: `bims-offline` v2), `src/components/shared/offline-sync.tsx` — quiz questions and flashcards cached to IndexedDB on student login; offline reads work in quiz and flashcard launchers ✅
- PWA Phase 3: write queue in IndexedDB (`write_queue` store), `src/components/shared/offline-queue-sync.tsx` — offline quiz results, flashcard reviews, and module submissions are queued and silently synced on reconnect ✅

---

## What Is Broken, Unknown, or Unverified
- **ACTION REQUIRED (manual):** Run `supabase-daily-challenge.sql` in Supabase SQL editor. The `daily_challenge_attempts` table does not exist in production — Daily Challenge will return 500 errors until this is done.
- **ACTION REQUIRED (manual):** Supabase → Auth → URL Configuration → set Site URL to Vercel URL, add `/reset-password` to Redirect URLs. Password reset emails will not redirect correctly until this is done.
- **ACTION REQUIRED (manual):** Add Anthropic billing credits at console.anthropic.com → Billing. Study Buddy and AI question extraction are broken in production until this is done.
- **UNVERIFIED:** Daily Challenge — end-to-end on live site (requires supabase-daily-challenge.sql above)
- **UNVERIFIED:** AI question extraction from past papers (`/api/extract-questions`) — requires Anthropic credits
- **UNVERIFIED:** Teacher announcements / student notifications — RLS policies already existed when SQL was run; confirm the feature works end-to-end
- **UNVERIFIED:** Review / Weak Areas — code deployed, not yet tested on live site with real attempt data
- **UNVERIFIED:** Tutorial spotlight — code deployed, not yet tested on a real device/browser
- **UNVERIFIED:** Password reset flow end-to-end (email → click link → `/reset-password` → success) — Supabase URL config required first
- **UNVERIFIED:** PWA offline on a real device — install app to home screen, go offline, attempt quiz and flashcards, reconnect and verify sync toast
- **UNVERIFIED:** Modules end-to-end on live site (teacher create/publish, student attempt/submit, gradebook)
- **UNVERIFIED:** Exam Centre PDF upload on live site
- **UNVERIFIED:** Profile pages on live site
- **UNVERIFIED:** Streak increment works across real days (logic in `progress.ts`, not tested over time)
- **UNVERIFIED:** `lessons_this_week` Monday reset (logic exists, never tested across a week boundary)
- **Known cosmetic issue:** Student names show as "Unknown" in teacher analytics — dev data issue, not a code bug; resolves with real signups
- **Not built:** Admin portal — admin role exists and has full access to both portals, but no dedicated admin-only UI (user management, invite system, school-wide analytics). Interim: create admins via Supabase → profiles table, change role to `admin`.
- **Not built:** Study Timer (next in agreed build order)
- **Not built:** Gradebook (teacher aggregate view across all modules)
- **Not built:** Discussions (teacher/student threads)

---

## Original App Comparison (bims.bi — reviewed Session 2)
Key gaps remaining in our build:
- **Study Timer** — timed study sessions (next in agreed order)
- **Gradebook** — teacher aggregate view across all modules
- **Discussions** — teacher/student threads
- **Curriculum Builder** — structured curriculum tied to Pearson Edexcel exam board units
- **Student Monitor / Coverage Grid / Trends** — analytics inside the Exam Center (teacher side)
- **Classes / Study Groups / Teaching Center / Patterns / Calendar** — community and extended features

Features we have that the original does NOT: AI Study Buddy, AI question extraction from PDFs, Teacher Analytics dashboard, PWA offline support, Interactive onboarding tutorial.

---

## Subject Enrolment Design (important context)
Students select their subjects **once at signup**. They cannot change subjects themselves. Teachers manage enrolments via the Students page (`/teacher/students`) using the `StudentEnroller` component. The student dashboard shows enrolled subjects as read-only badges with a message to "contact your teacher" if none enrolled.

---

## Key Gotchas for New Sessions
1. **`as any` on inserts** — Supabase insert/update objects type as `never` with manual DB types. Always cast with `(supabase as any).from(...)` rather than `.update({...} as any)` — the latter hits a TS2345 error.
2. **Select `onValueChange` type** — shadcn Select passes `string | null`, not `string`. Use `(v: string | null) => { if (v) setState(v) }`.
3. **`SelectValue` display** — Must pass explicit children to show the label: `<SelectValue>{items.find(i => i.id === value)?.name ?? 'Placeholder'}</SelectValue>`.
4. **Role from profile** — Use `(data as any)?.role` pattern; Supabase types can resolve to `never`.
5. **Node PATH in PowerShell** — If `node`/`npx` not found, reload PATH: `$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")`.
6. **Anthropic SDK streaming** — `MessageStream` has no `.textStream`. Use `for await (const event of stream)` and check `event.type === 'content_block_delta' && event.delta.type === 'text_delta'`.
7. **Supabase Storage** — The `past-papers` bucket exists as a public bucket. ✅
8. **Next.js 16 dynamic params** — `params` is now a `Promise`. Always `const { id } = await params` in async server components. Pattern: `params: Promise<{ id: string }>`.
9. **Vercel Root Directory** — Must be empty (not `./` with a value, not a subdirectory path). The repo root is the app root.
10. **Redeploy after env var changes** — Changing env vars in Vercel Settings does not auto-redeploy. Must manually redeploy or push a new commit.
11. **School logo** — Image is at `public/logo.png`. Confirmed working on live site. White rounded container (`bg-white rounded-xl p-0.5`) ensures visibility in dark mode.
12. **PWA manifest** — Uses Next.js 16 native `MetadataRoute.Manifest` via `src/app/manifest.ts`. Do NOT add `@ducanh2912/next-pwa` or a static `public/manifest.json` — the native API handles it.
13. **IndexedDB** — DB name `bims-offline`, version 2, three stores: `quiz_questions`, `flashcards`, `write_queue`. No external library — uses native IndexedDB API. `offline-db.ts` wraps it in Promises.
14. **Service worker** — At `public/sw.js`. Cache name `bims-v1`. Pre-caches `['/', '/login', '/offline']`. Cache-first for `_next/` assets, network-first with cache fallback for navigation. Registered by `ServiceWorkerRegister` client component in root layout.
15. **Admin access** — In `proxy.ts`, admin role gets an early `return supabaseResponse` that bypasses all route checks. `redirectByRole` sends admins to `/teacher`. Admins can also visit `/student/*` routes freely.
16. **Public routes in proxy.ts** — The full list is: `['/login', '/signup', '/forgot-password', '/reset-password', '/offline']`. If adding new auth pages, add them here.
17. **Daily Challenge XP update** — `progress.ts` uses the browser Supabase client and cannot be called from API routes. The Daily Challenge API route (`/api/daily-challenge/route.ts`) inlines the full XP/streak/level/lessons_this_week logic using the server Supabase client. If the XP formula changes, update both `progress.ts` and the Daily Challenge route.
18. **Daily Challenge answer security** — Correct answer is never sent to client before submission. The server page strips `correct_answer` before passing question to the client component. The API route fetches it server-side to check. The question pool is visible in Supabase if a student has direct DB access — acceptable for school context.
19. **Tutorial localStorage** — Key is `bims_tutorial_v1`. The tutorial auto-shows if this key is absent. "Take the tour" button on Profile removes the key then dispatches `bims:launch-tutorial` custom event. `TutorialController` in the layout hears this and shows the modal without navigation.
20. **Tutorial targeting** — Tutorial targets `[data-tutorial="nav-x"]` attributes on sidebar nav links. These are always rendered in the layout, so no page navigation is needed during the tour. Steps with no `targetSelector` show a centered full-screen card.

---

## Exact Next Steps for Next Session
1. **CRITICAL manual step:** Run `supabase-daily-challenge.sql` in Supabase SQL editor before testing Daily Challenge.
2. **Manual:** Supabase → Auth → URL Configuration → set Site URL to Vercel URL, add `/reset-password` to Redirect URLs. Then test the full password reset flow end-to-end.
3. **Manual:** Add Anthropic billing credits at console.anthropic.com → Billing. Then test Study Buddy and AI question extraction on live site.
4. **Next feature to build:** Study Timer — timed study sessions with XP reward at completion. Next in agreed build order (Daily Challenge ✅ → Review ✅ → Study Timer → Gradebook → Discussions).
5. **Test unverified features** — once SQL is run and credits added, verify Daily Challenge, announcements, review, and AI extraction on the live site.

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
