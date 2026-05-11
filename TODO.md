# TODO.md

## Immediate Next Task
- [ ] **Study Timer** — timed study sessions with XP reward at the end. Next in the agreed build order (Daily Challenge ✅ → Review ✅ → Study Timer → Gradebook → Discussions).

## Manual Steps Required (Supabase)
- [ ] **Run `supabase-daily-challenge.sql`** in Supabase SQL editor — Daily Challenge page will error until this table exists *(UNVERIFIED in production)*
- [ ] **Supabase URL config** — Supabase → Auth → URL Configuration → set Site URL to Vercel URL, add `/reset-password` to Redirect URLs *(password reset broken until this is done)*
- [ ] **Add Anthropic credits** — console.anthropic.com → Billing. Study Buddy + AI question extraction broken in production until this is done.

## Unverified Features (built, not yet tested in production)
- [ ] Daily Challenge — end-to-end on live site (requires SQL above to run first)
- [ ] AI question extraction from past papers (`/api/extract-questions`) — requires Anthropic credits
- [ ] Teacher announcements / student notifications — RLS policies appeared to already exist when SQL was run; confirm the feature works end-to-end
- [ ] Review / Weak Areas — code deployed, untested on live site with real attempt data
- [ ] Tutorial spotlight — code deployed, untested on real device/browser
- [ ] Password reset flow end-to-end (requires Supabase URL config above)
- [ ] PWA offline on a real device — install to home screen, go offline, attempt quiz/flashcards, reconnect and verify sync toast
- [ ] Modules end-to-end on live site
- [ ] Exam Centre PDF upload on live site
- [ ] Profile pages on live site
- [ ] Streak increment across real days (logic untested over time)
- [ ] `lessons_this_week` Monday reset (logic exists, never tested across a week boundary)

## Later Tasks
- [ ] **Gradebook** — teacher aggregate view across all modules (4th in agreed order)
- [ ] **Discussions** — teacher/student threads (5th in agreed order)
- [ ] **Admin portal** — user management, invite system, school-wide analytics
  - *(Interim: create admins via Supabase → profiles table, set role to `admin`)*
- [ ] Custom domain — Vercel → Settings → Domains
- [ ] Switch Anthropic key to dedicated school account for production
- [ ] Enable email confirmation in Supabase Auth for production
- [ ] Light mode polish
- [ ] Consider `supabase gen types typescript` to remove `as any` casts

## Bugs / Known Issues
- **Student names show as "Unknown" in teacher analytics** — dev data issue, resolves with real signups
- **Streak reset on Monday** — logic in `src/lib/progress.ts`, untested across a week boundary
- **Offline queue for modules** — score computed at submit time; if questions change before sync the stored score stands (acceptable for school context)
- **Daily Challenge answer security** — correct answer is not sent to client before submission (checked server-side in `/api/daily-challenge`), but the question pool is visible in Supabase if a student has direct DB access. Acceptable for a school context.

## Completed This Session ✅
- **Teacher Messages / Announcements** — `announcements` table, `MessagesManager` component, teacher messages page rebuilt from stub
- **Student Notifications** — `NotificationsView` component, `/student/notifications` page, sidebar link
- **AI Question Extraction** — `/api/extract-questions/route.ts` uses Claude Sonnet to extract MCQs from uploaded PDFs; "Extract Qs" button on each paper in Exam Centre manager; review panel with topic picker and save to Content Library
- **Daily Challenge** — `supabase-daily-challenge.sql`, `/api/daily-challenge/route.ts` (server-side answer check), `/student/daily-challenge/page.tsx`, `DailyChallengeView` component; +35 XP correct / +5 XP participation; one attempt per day; deterministic question by date; sidebar link + dashboard tile
- **Review / Weak Areas** — `/student/review/page.tsx` (looks at last 40 attempts, surfaces most-recently-wrong questions), `ReviewView` component (inline MCQ practice, "Mastered" badge on correct, grouped by subject); no SQL needed; sidebar link
- **Interactive Onboarding Tutorial** — spotlight tour (box-shadow cutout, animated primary-colour ring, tooltip card); `tutorial-modal.tsx`, `tutorial-controller.tsx`; auto-shows on first login (localStorage `bims_tutorial_v1`); relaunches from Profile → "Take the tour" button (custom event `bims:launch-tutorial`); `data-tutorial` attributes on all sidebar nav links; student 11-step tour, teacher 8-step tour

## Previously Completed ✅
- Teacher analytics, deployed to Vercel, Supabase modules tables + past-papers bucket
- Signup flow verified in production
- Full student portal (quiz, flashcards, progress, leaderboard, exam centre, study buddy, modules, profile)
- Full teacher portal (content, students, exam centre, modules, analytics, profile)
- Password management (change, forgot, reset)
- Admin access to both portals
- PWA phases 1–3 (manifest, service worker, offline reads, write queue + sync)
- Study Buddy strict guardrails
- Geography → Business migration

## Files Changed This Session
```
CREATED:
  supabase-announcements.sql
  supabase-daily-challenge.sql
  src/app/api/extract-questions/route.ts
  src/app/api/daily-challenge/route.ts
  src/app/student/daily-challenge/page.tsx
  src/app/student/notifications/page.tsx
  src/app/student/review/page.tsx
  src/components/teacher/messages-manager.tsx
  src/components/student/notifications-view.tsx
  src/components/student/daily-challenge-view.tsx
  src/components/student/review-view.tsx
  src/components/shared/tutorial-modal.tsx
  src/components/shared/tutorial-controller.tsx

UPDATED:
  src/app/teacher/messages/page.tsx          — rebuilt from stub; uses MessagesManager
  src/app/teacher/exam-center/page.tsx       — added topics fetch for extraction UI
  src/app/student/page.tsx                   — added Daily Challenge tile to quick links
  src/app/student/layout.tsx                 — added TutorialController
  src/app/teacher/layout.tsx                 — added TutorialController
  src/components/teacher/exam-center-manager.tsx — major update: Extract Qs button, review panel, save to library
  src/components/shared/profile-form.tsx     — added "Take the tour" relaunch button
  src/components/layout/student-sidebar.tsx  — Daily Challenge, Review, Notifications links; data-tutorial attributes
  src/components/layout/teacher-sidebar.tsx  — data-tutorial attributes on all nav links
  src/types/database.ts                      — added announcements table type
```

## Commands to Run Next
```bash
# Deploy all changes
git add .
git commit -m "describe changes"
git push
# Vercel auto-deploys on push to master
```

Manual:
1. Run `supabase-daily-challenge.sql` in Supabase SQL editor
2. Supabase → Auth → URL Configuration → set Site URL + add `/reset-password` to Redirect URLs
3. Add Anthropic billing credits at console.anthropic.com
