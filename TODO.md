# TODO.md

## Immediate Tasks
- [ ] **Save school logo** — copy the logo image into `public/logo.png`, then push to GitHub. Code is already in place; app shows a broken image until this file exists. *(manual step)*
- [ ] **Add Anthropic credits** — console.anthropic.com → Billing → add card + credits. Required before Study Buddy works in production. *(manual step)*
- [ ] **Verify email confirmation is off** — Supabase → Auth → Providers → Email → confirm "Confirm email" toggle is OFF *(unverified)*

## PWA / Offline Support (agreed, not yet started)
Three phases — must be done in order:

- [ ] **Phase 1 — PWA Foundation**
  - Install `@ducanh2912/next-pwa`
  - Add `manifest.json` to `public/` (app name, icon, theme colour)
  - Configure service worker in `next.config.ts`
  - App shell cached automatically — students can install to home screen
  - Shows "you're offline" screen gracefully instead of browser error

- [ ] **Phase 2 — Offline Data (read)**
  - On login, fetch and store to IndexedDB: quiz questions, flashcards, module content for enrolled subjects
  - Quiz and flashcard pages read from IndexedDB when offline
  - Past paper PDFs cached when first opened — available offline after that
  - Study Buddy, Leaderboard, Analytics remain online-only (acceptable)

- [ ] **Phase 3 — Offline Writes + Sync**
  - Queue quiz results, flashcard reviews, module submissions to IndexedDB when offline
  - On reconnect, automatically sync queued data to Supabase
  - Student sees answers saved locally immediately; sync happens silently

## Later Tasks
- [ ] Test Study Buddy on live site (after credits added)
- [ ] Test Modules end-to-end on live site — teacher creates/publishes, student attempts, teacher views gradebook *(UNVERIFIED)*
- [ ] Test Exam Centre PDF upload on live site *(UNVERIFIED)*
- [ ] Test Profile pages on live site *(UNVERIFIED)*
- [ ] Teacher messages — send message to individual student or all students in a subject *(stub page only)*
- [ ] Student notifications — display messages received from teachers
- [ ] **Admin portal** — dedicated portal for admin role with:
  - User management (view all users, change roles, deactivate accounts)
  - Invite system (invite teachers/admins by email without open signup)
  - School-wide analytics overview
  - Subject and content oversight
  - *(For now: create admin accounts via Supabase dashboard — change `role` to `admin` in profiles table)*
- [ ] Review / Weak areas — student tool surfacing questions previously answered incorrectly
- [ ] Study Timer — timed study sessions with XP reward
- [ ] Daily Challenge — gamified daily prompt (+35 XP)
- [ ] Discussions — teacher/student discussion threads
- [ ] Custom domain — set up school domain in Vercel → Settings → Domains
- [ ] Switch Anthropic key to dedicated school account when ready for full production use
- [ ] Light mode polish — verify all components look correct in light theme
- [ ] Enable email confirmation in Supabase Auth for production
- [ ] Consider switching to `supabase gen types typescript` to remove `as any` casts (schema must be stable first)

## Bugs / Issues
- **`public/logo.png` missing** — logo code is in place but image file not yet saved to `public/`. Shows broken image on login, signup, and both sidebars until fixed.
- **Student names show as "Unknown" in teacher analytics** — dev data issue (quiz attempts exist without matching profile rows). Resolves automatically with real student signups. Not a code bug.
- **Streak reset on Monday** — `lessons_this_week` resets if `last_active_date` isn't the same Monday. Logic is in `src/lib/progress.ts`. *(UNVERIFIED — not tested across a week boundary)*
- **Email confirmation status** — Unverified whether it is off in Supabase dashboard. If on, new signups silently fail.

## Completed This Session ✅
- Added school logo to login page, signup page, student sidebar, teacher sidebar
  - `src/app/(auth)/login/page.tsx` — BookOpen icon replaced with `<Image src="/logo.png">`
  - `src/app/(auth)/signup/page.tsx` — same
  - `src/components/layout/student-sidebar.tsx` — same
  - `src/components/layout/teacher-sidebar.tsx` — same
- Planned PWA offline support in 3 phases (agreed, not yet built)

## Previously Completed ✅
- Teacher analytics page built (replaced stub)
- Deployed to Vercel ✅
- Supabase modules tables created, past-papers bucket created
- Signup flow verified in production
- Changed third subject from Geography to Business
- Built full Modules/Assignments system
- AI Study Buddy, Exam Centre, Profile pages, Leaderboard, Progress
- Student dashboard, quiz, flashcards
- Teacher content manager, students page, StudentEnroller
- `src/lib/progress.ts` shared XP/streak/level utility
- TypeScript passing clean

## Files Changed This Session
```
UPDATED:
  src/app/(auth)/login/page.tsx               — school logo added, BookOpen removed
  src/app/(auth)/signup/page.tsx              — school logo added, BookOpen removed
  src/components/layout/student-sidebar.tsx  — school logo added, BookOpen removed
  src/components/layout/teacher-sidebar.tsx  — school logo added, BookOpen removed
  CLAUDE_HANDOFF.md                           — updated for session 5
  TODO.md                                     — updated for session 5
  PROJECT_DECISIONS.md                        — updated for session 5

PENDING (manual):
  public/logo.png                             — must be saved by user before pushing
```

## Commands to Run Next
```bash
# After saving public/logo.png:
git add .
git commit -m "Add school logo and PWA plan"
git push
# Vercel auto-deploys on push
```
