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
      login/page.tsx              — Login page (email + password, link to signup)
      signup/page.tsx             — Signup page (name, email, password, role, subject selection) ✅
    page.tsx                      — Root redirect (role-based)
    layout.tsx                    — Root layout (ThemeProvider, Toaster)
    api/
      study-buddy/route.ts        — POST route: streams Claude Haiku response via Anthropic SDK ✅
    student/
      layout.tsx                  — Student layout (sidebar + topbar)
      page.tsx                    — Student dashboard (XP, streak, tiles, read-only subject badges)
      quiz/page.tsx               — Quiz page (full MCQ flow, XP rewards) ✅
      flashcards/page.tsx         — Flashcards page (3D flip, spaced rep) ✅
      exam-center/page.tsx        — Exam Centre (lists past papers by enrolled subject, opens PDF) ✅
      progress/page.tsx           — Progress analytics (XP bar, stats, per-subject scores, quiz history) ✅
      leaderboard/page.tsx        — Top 25 by XP, medals for top 3, current user highlighted ✅
      study-buddy/page.tsx        — AI chat tutor (subject-aware, streams Claude Haiku) ✅
      profile/page.tsx            — Profile page (edit display name, read-only subjects) ✅
      modules/page.tsx            — Lists published modules for enrolled subjects ✅
      modules/[id]/page.tsx       — Individual module attempt page (Next.js 16 async params) ✅
    teacher/
      layout.tsx                  — Teacher layout (sidebar + topbar, role guard)
      page.tsx                    — Teacher dashboard (stats, quick actions) ✅
      content/page.tsx            — Content manager (quiz Qs, flashcards, topics) ✅
      students/page.tsx           — Student list with XP/streak/quiz stats + enrolment manager ✅
      exam-center/page.tsx        — Exam Centre (upload PDFs, list all papers, delete) ✅
      modules/page.tsx            — Module manager (create, publish, gradebook) ✅
      analytics/page.tsx          — Analytics dashboard (summary stats, per-subject, top performers, recent activity) ✅
      messages/page.tsx           — Stub only
      profile/page.tsx            — Profile page (edit display name) ✅
  components/
    layout/
      student-sidebar.tsx         — Includes Modules + Profile links ✅
      teacher-sidebar.tsx         — Includes Modules + Profile links ✅
    shared/
      theme-provider.tsx
      theme-toggle.tsx
      profile-form.tsx            — Shared profile editor (name, read-only email/role, enrolled subjects for students) ✅
    student/
      quiz-launcher.tsx           — Full quiz engine (setup → quiz → results)
      flashcard-launcher.tsx      — Full flashcard engine (flip, confidence, spaced rep)
      exam-center-view.tsx        — Subject tab switcher, papers grouped by year, PDF open button ✅
      study-buddy-chat.tsx        — Streaming chat UI (subject pills, message thread, abort on cancel) ✅
      module-list.tsx             — Module cards with status badge (submitted/overdue/not started) ✅
      module-attempt.tsx          — Attempt UI (one question at a time, prev/next, reveal, submit, results + review) ✅
    teacher/
      content-manager.tsx         — Tabs: Quiz Questions / Flashcards / Topics
      student-enroller.tsx        — Per-student enrolment manager (add/remove subjects inline) ✅
      exam-center-manager.tsx     — Upload form + paper list with delete (Storage + DB) ✅
      module-manager.tsx          — Create module, list with publish/unpublish/delete, gradebook per module ✅
    ui/                           — shadcn/ui components
  lib/
    supabase/
      client.ts                   — Browser Supabase client
      server.ts                   — Server Supabase client (uses cookies())
    progress.ts                   — Shared XP/streak/level/lessons_this_week update utility ✅
  proxy.ts                        — Auth + role-based route protection
  types/database.ts               — Full TypeScript DB schema (manual, not generated)

supabase-schema.sql               — Full DB schema (run once, already executed)
supabase-modules.sql              — Modules tables schema — ALREADY RUN ✅
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
- Auth: Email provider enabled. Email confirmation status — **UNVERIFIED** (check Supabase → Auth → Providers → Email)
- Triggers: `handle_new_user` (auto-creates profile on signup) ✅ — verified working in production
- Triggers: `handle_new_student_progress` (auto-creates user_progress row for students) ✅
- Storage bucket `past-papers`: **CREATED** as public bucket ✅
- `supabase-modules.sql`: **ALREADY RUN** — modules, module_questions, module_submissions tables exist in live DB ✅

---

## Vercel Deployment
- Deployed and live ✅
- GitHub repo: `bims-companion_app` (private, master branch)
- Root Directory: empty (repo root is the app root — do not set a subdirectory)
- Environment variables set in Vercel: all 4 configured ✅
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

**Note on Anthropic API key:** Currently using a personal Anthropic account. For production school use, create a dedicated school account at console.anthropic.com, generate a new key, and swap it in Vercel → Settings → Environment Variables → Redeploy.

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
- Student study buddy: subject-aware AI chat using Claude Haiku, streaming responses, subject pill selector
- Student profile page: edit display name, read-only email/role, enrolled subjects list
- Student modules: list published modules with status badges, full attempt UI (one-at-a-time, prev/next, reveal, submit), results screen with per-question review, XP earned
- Teacher portal: layout, sidebar, dashboard with stats
- Teacher content manager: create quiz questions, flashcards, topics — all saved to Supabase
- Teacher students page: lists all students with XP/streak/quiz stats, subject pills, per-student enrolment manager
- Teacher exam centre: upload PDFs to Supabase Storage (`past-papers` bucket), save record to DB, list all papers, delete (removes from Storage + DB)
- Teacher modules: create modules with question picker, publish/unpublish, delete, on-demand gradebook per module
- Teacher analytics: summary stats (total attempts, avg score, active this week, total XP), per-subject breakdown with progress bars, top performers list, recent quiz activity feed
- Teacher profile page: edit display name, read-only email/role
- Both sidebars: Modules + Profile links, highlights on active route
- `StudentEnroller` component: teachers expand a panel per student to add/remove subject enrolments
- Signup page: collects name, email, password, role, subject selection (students only); enrols student in selected subjects after signup — **verified working in production** ✅
- `src/lib/progress.ts`: shared utility that handles XP, level, streak, and `lessons_this_week` in one atomic DB update
- Subject changed from Geography to Business across all code and live database
- TypeScript passing clean (`tsc --noEmit` no errors) ✅
- Deployed to Vercel ✅

---

## What Is Broken, Unknown, or Unverified
- **UNVERIFIED:** Study Buddy in production — Anthropic credits not yet added; feature will error until billing is set up at console.anthropic.com
- **UNVERIFIED:** Modules system end-to-end — tables exist but not manually tested (teacher create/publish, student attempt/submit, gradebook)
- **UNVERIFIED:** Exam Centre PDF upload in production — bucket exists but upload flow not tested on live site
- **UNVERIFIED:** Profile pages in production — not tested on live site
- **UNVERIFIED:** Email confirmation status — unknown if on or off in Supabase Auth settings
- **UNVERIFIED:** Streak increment works across real days (logic is in `progress.ts` but not tested over time)
- **UNVERIFIED:** `lessons_this_week` Monday reset (logic exists, never tested across a week boundary)
- **Known cosmetic issue:** Student names show as "Unknown" in teacher analytics when quiz attempts exist but profile rows are missing — dev data issue, not a code bug; will resolve with real signups
- **Not built:** Teacher messages page (stub only)
- **Not built:** Student notifications
- **Not built:** Review / Weak areas (student tool)
- **Not built:** Study Timer
- **Not built:** Daily Challenge
- **Not built:** Discussions

---

## Original App Comparison (bims.bi — reviewed Session 2)
Key gaps remaining in our build:
- **Gradebook** — teacher aggregate view across all modules
- **Curriculum Builder** — structured curriculum tied to Pearson Edexcel exam board units
- **Student Monitor / Coverage Grid / Trends** — analytics inside the Exam Center (teacher side)
- **Review (Weak areas)** — student tool surfacing questions they've struggled with
- **Study Timer** — timed study sessions
- **Daily Challenge** — gamified daily prompt (+35 XP)
- **Classes / Study Groups / Discussions / Teaching Center / Patterns / Calendar** — community and extended features

Features we have that the original does NOT: AI Study Buddy, Teacher Analytics dashboard.

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

---

## Exact Next Steps for Next Session
1. **Add Anthropic credits** — console.anthropic.com → Billing → add card + credits. Then test Study Buddy on live site.
2. **Test Modules end-to-end on live site** — teacher creates module, publishes it, student attempts and submits, teacher views gradebook
3. **Test Exam Centre PDF upload on live site**
4. **Verify email confirmation is off** — Supabase → Auth → Providers → Email → "Confirm email" toggle
5. **Build teacher messages / student notifications**
6. **Consider switching Anthropic key to school account** when ready for full production use

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
