# TODO.md

## Immediate Next Task
- [ ] **Run SQL scripts in Supabase** — in this exact order (see commands below). Teacher portal is broken in production until step 1 is done.

## Manual Steps Required (Supabase) — Run in this order
- [ ] **Run the DROP+RECREATE version of `supabase-teacher-subjects.sql`** — the table and some policies already exist from a previous partial run. Use the DROP POLICY IF EXISTS version from the session (see CLAUDE_HANDOFF.md). ⚠️ BLOCKING — teacher portal non-functional without this.
- [ ] **Run `supabase-admin-enroll.sql`** — DB trigger for admin auto-enrollment. Run AFTER teacher-subjects. If it errors with "already exists", ask Claude for the drop-first version.
- [ ] **Run `supabase-study-timer.sql`** — `study_sessions` table. Study Timer saves no data and awards no XP without this. ⚠️ BLOCKING for XP
- [ ] **Run `supabase-daily-challenge.sql`** — Daily Challenge returns 500 errors without this. ⚠️ BLOCKING
- [ ] **Re-assign teacher unit via `/admin/teachers`** — do this AFTER teacher-subjects SQL runs. The previous admin assignment failed silently because the table didn't exist.
- [ ] **Supabase URL config** — Auth → URL Configuration → set Site URL to Vercel URL, add `/reset-password` to Redirect URLs.
- [ ] **Add Anthropic credits** — console.anthropic.com → Billing. Study Buddy and AI question extraction broken in production.

## Next Feature to Build
- [ ] **Gradebook** — dedicated `/teacher/gradebook` page: aggregate view of all students × all modules in one table (rows = students, columns = modules, cells = score/% or "Not submitted"). The per-module inline gradebook already exists inside the Modules page — this is the school-wide view. (4th in agreed order: Daily Challenge ✅ → Review ✅ → Study Timer ✅ → Gradebook → Discussions)

## Later Features
- [ ] **Discoverability fixes** — teachers couldn't find how to register or enrol students. Quick wins: add signup hint on login page, add empty-state prompt on teacher dashboard when no students enrolled.
- [ ] **Discussions** — teacher/student threads per subject (5th in agreed order)
- [ ] **Curriculum Builder** — structured content tree (Subject → Year → Unit → Chapter → Lesson). Significant build, 2–3 sessions. Most-requested missing feature from teacher feedback.
- [ ] **Admin portal enhancements** — invite system, bulk enrolment, school-wide analytics
- [ ] Custom domain — Vercel → Settings → Domains
- [ ] Switch Anthropic key to dedicated school account for production
- [ ] Enable email confirmation in Supabase Auth for production
- [ ] Light mode polish
- [ ] Consider `supabase gen types typescript` to remove `as any` casts
- [ ] Multi-tenancy (`school_id` on all tables) before selling to a second school

## Bugs / Known Issues
- **Streak reset on Monday** — logic in `src/lib/progress.ts`, untested across a week boundary
- **Offline queue for modules** — score computed at submit time; if questions change before sync the stored score stands (acceptable for school context)
- **Daily Challenge answer security** — correct answer not sent to client before submission, but question pool visible in Supabase if a student has direct DB access. Acceptable for school context.

## Unverified Features (built, not yet tested in production)
- [ ] Teacher unit assignment — teacher_subjects SQL not yet run cleanly
- [ ] Admin portal — admin-enroll SQL not yet run; auto-enrollment untested
- [ ] Study Timer — study_sessions SQL not yet run; XP award untested end-to-end
- [ ] Daily Challenge — end-to-end on live site (requires supabase-daily-challenge.sql)
- [ ] AI question extraction from past papers (`/api/extract-questions`) — requires Anthropic credits
- [ ] Teacher announcements / student notifications — confirm end-to-end
- [ ] Review / Weak Areas — deployed, untested with real data
- [ ] Tutorial spotlight — mobile sidebar auto-open + bottom-anchored tooltip deployed; untested on real device end-to-end
- [ ] Password reset flow end-to-end (requires Supabase URL config)
- [ ] PWA offline on a real device
- [ ] Modules end-to-end on live site
- [ ] Exam Centre PDF upload on live site
- [ ] Streak increment across real days

## Completed This Session ✅
- **Mobile responsive sidebars** — all three portals (student, teacher, admin) now have a hamburger drawer. Sidebar slides in from left on mobile with dark backdrop overlay. Nav links close the drawer on tap.
- **Layout scroll fix** — `items-start` on outer container + removed `flex-1` from `main`. Previously the sidebar's `min-h-screen` locked the page to exactly 100vh; content below the fold was unreachable on smaller screens (change password and tutorial button were invisible on teacher profile).
- **Tutorial bug fixes:**
  - Per-portal localStorage keys (`bims_student_tutorial_v1` / `bims_teacher_tutorial_v1`) — shared key meant completing student tour prevented teacher tour from ever showing
  - Mobile sidebar auto-opens when tutorial launches (`bims:open-sidebar` event, 350ms delay before modal mounts so sidebar animation completes before element measurement)
  - Mobile tooltip anchored to bottom of screen — previously positioned to the right of sidebar nav items, overflowing the viewport and hiding the Next button
  - Profile "Take the tour" button now clears both portal keys correctly
- **SQL drop-first fix** — `supabase-teacher-subjects.sql` was previously partially run; provided DROP POLICY IF EXISTS version to clean up

## Previously Completed ✅
- Teacher unit selection at signup, teacher portal scoping, admin portal
- Admin auto-enrollment trigger, admin/teacher sidebar portal toggles
- Analytics bug fix (Unknown student names)
- Visual enhancements (login/signup blobs, student dashboard hero, coloured stat cards, themed quick-link tiles)
- Study Timer, Daily Challenge, Review / Weak Areas, Notifications
- Full student portal (quiz, flashcards, progress, leaderboard, exam centre, study buddy, modules, profile)
- Full teacher portal (content, students, exam centre, modules, analytics, messages, profile)
- Password management (change, forgot, reset)
- PWA phases 1–3 (manifest, service worker, offline reads, write queue + sync)
- Interactive onboarding tutorial (student + teacher)
- Geography → Business migration

## Files Changed This Session
```
UPDATED:
  src/components/layout/student-sidebar.tsx  — mobile drawer (hamburger, backdrop, slide-in), bims:open/close-sidebar listeners
  src/components/layout/teacher-sidebar.tsx  — same
  src/components/layout/admin-sidebar.tsx    — same
  src/app/student/layout.tsx                 — pl-14 topbar, p-4 md:p-6 main, items-start outer, removed flex-1 from main
  src/app/teacher/layout.tsx                 — same
  src/app/admin/layout.tsx                   — same
  src/app/student/page.tsx                   — hero heading text-2xl md:text-3xl
  src/components/shared/tutorial-controller.tsx — per-portal keys, bims:open-sidebar on launch with 350ms delay, bims:close-sidebar on close
  src/components/shared/tutorial-modal.tsx   — mobile: tooltip anchored to bottom of screen
  src/components/shared/profile-form.tsx     — Take the tour button clears both portal localStorage keys
```

## Commands to Run Next
```
# All changes are already pushed to master — Vercel auto-deployed.
# No further git commands needed.
```

Manual (run in Supabase SQL editor, in this order):
1. DROP POLICY IF EXISTS version of supabase-teacher-subjects.sql (see CLAUDE_HANDOFF.md for the exact SQL)
2. supabase-admin-enroll.sql
3. Re-assign teacher unit via /admin/teachers
4. supabase-study-timer.sql
5. supabase-daily-challenge.sql
6. Supabase → Auth → URL Configuration → Site URL + /reset-password redirect
7. Add Anthropic billing credits
