# TODO.md

## Immediate Tasks
- [x] **Build teacher messages / student notifications** — broadcast announcements to subject groups or all students ✅
- [ ] **Test password reset flow** — requires Supabase URL config first: Supabase → Auth → URL Configuration → set Site URL to your Vercel URL, add `/reset-password` to Redirect URLs *(UNVERIFIED end-to-end)*
- [ ] **Add Anthropic credits** — console.anthropic.com → Billing. Study Buddy broken until this is done. *(manual step)*
- [ ] **Test PWA offline** — on a real device: install app to home screen, go offline, attempt a quiz and flashcards, reconnect and verify sync toast appears *(UNVERIFIED on device)*

## Later Tasks
- [ ] **Admin portal** — dedicated portal for admin role:
  - User management (view all users, change roles, deactivate accounts)
  - Invite system (invite teachers/admins by email without open signup)
  - School-wide analytics overview
  - *(Interim: create admins via Supabase → profiles table, change role to `admin`)*
- [ ] Test Modules end-to-end on live site *(UNVERIFIED)*
- [ ] Test Exam Centre PDF upload on live site *(UNVERIFIED)*
- [ ] Test Profile pages on live site *(UNVERIFIED)*
- [ ] Review / Weak areas — student tool surfacing questions previously answered incorrectly
- [ ] Study Timer — timed study sessions with XP reward
- [ ] Daily Challenge — gamified daily prompt (+35 XP)
- [ ] Discussions — teacher/student discussion threads
- [ ] Custom domain — Vercel → Settings → Domains
- [ ] Switch Anthropic key to dedicated school account for production
- [ ] Light mode polish
- [ ] Enable email confirmation in Supabase Auth for production
- [ ] Consider `supabase gen types typescript` to remove `as any` casts

## Bugs / Issues
- **Student names show as "Unknown" in teacher analytics** — dev data issue, resolves with real signups
- **Streak reset on Monday** — logic in `src/lib/progress.ts`, untested across a week boundary
- **Offline queue for modules** — queued submissions store the score computed at submit time; if the student goes offline mid-module and the questions change before sync, the stored score stands (acceptable for a school context)

## Completed This Session ✅
- **Teacher Messages / Student Notifications** — `announcements` table (RLS), `MessagesManager` (teacher compose + sent history), `NotificationsView` (student), Notifications nav in student sidebar
- Password change on profile page (`profile-form.tsx`)
- Forgot password page (`src/app/(auth)/forgot-password/page.tsx`)
- Reset password page (`src/app/(auth)/reset-password/page.tsx`)
- "Forgot password?" link on login page
- Admin access to both student and teacher portals (`proxy.ts`)
- School logo confirmed working on live site
- **PWA Phase 1** — manifest (`src/app/manifest.ts`), service worker (`public/sw.js`), offline page (`src/app/offline/page.tsx`), SW registration (`service-worker-register.tsx`)
- **PWA Phase 2** — IndexedDB layer (`src/lib/offline-db.ts`), silent sync on student portal load (`offline-sync.tsx`), offline reads in quiz and flashcard launchers
- **PWA Phase 3** — write queue in IndexedDB, background sync on reconnect (`offline-queue-sync.tsx`), offline writes queued in quiz, flashcard, and module components
- Study Buddy guardrails tightened — strict subject-only system prompt, refuses off-topic, ignores persona changes

## Previously Completed ✅
- Teacher analytics page
- Deployed to Vercel
- Supabase modules tables + past-papers bucket created
- Signup flow verified in production
- Full student portal (quiz, flashcards, progress, leaderboard, exam centre, study buddy, modules, profile)
- Full teacher portal (content, students, exam centre, modules, analytics, profile)
- Geography → Business migration

## Files Changed This Session
```
CREATED:
  src/app/(auth)/forgot-password/page.tsx
  src/app/(auth)/reset-password/page.tsx
  src/app/manifest.ts
  src/app/offline/page.tsx
  src/lib/offline-db.ts
  src/components/shared/service-worker-register.tsx
  src/components/shared/offline-sync.tsx
  src/components/shared/offline-queue-sync.tsx
  public/sw.js

UPDATED:
  src/components/shared/profile-form.tsx       — change password card
  src/app/(auth)/login/page.tsx                — "Forgot password?" link
  src/app/layout.tsx                           — ServiceWorkerRegister added
  src/app/student/layout.tsx                   — OfflineSync + OfflineQueueSync added
  src/components/student/quiz-launcher.tsx     — offline read + write queue
  src/components/student/flashcard-launcher.tsx — offline read + write queue
  src/components/student/module-attempt.tsx    — offline write queue
  src/proxy.ts                                 — admin access, public routes updated
  src/app/api/study-buddy/route.ts             — strict guardrails system prompt
  CLAUDE_HANDOFF.md                            — updated for session 6
  TODO.md                                      — updated for session 6
  PROJECT_DECISIONS.md                         — updated for session 6
```

## Commands to Run Next
```bash
git add .
git commit -m "your message"
git push
```

Manual steps:
1. Supabase → Auth → URL Configuration → set Site URL to Vercel URL, add `/reset-password` to Redirect URLs
2. Add Anthropic billing credits (console.anthropic.com)
