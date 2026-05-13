# TODO.md

## Immediate Next Tasks (run in this order)

- [ ] **Run avatars bucket RLS SQL** in Supabase SQL Editor — BLOCKING for custom photo uploads. Run these three policies (if not already done):
  ```sql
  CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND name = (auth.uid()::text || '.' || split_part(name, '.', 2)));

  CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

  CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
  ```
  (Check existing policies first: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects';`)

- [ ] **Run `supabase-curriculum.sql`** in Supabase SQL Editor — BLOCKING for Curriculum Builder, Lesson Editor, and all AI import features
- [ ] **Run `supabase-curriculum-import.sql`** in Supabase SQL Editor — BLOCKING for Textbook Import Wizard (creates `curriculum_import_jobs` table + RLS)
- [ ] **Create `lesson-media` storage bucket** — Supabase → Storage → New bucket → Name: `lesson-media` → Public: **YES** — BLOCKING for lesson media uploads AND textbook PDF uploads
- [ ] **Add Anthropic credits** — console.anthropic.com → Billing — BLOCKING for all AI features (Import from PDF, Textbook Import Wizard, Study Buddy, question extraction)

> After avatars RLS is applied, test photo upload on the profile page. After all curriculum steps are done, test Curriculum Builder end-to-end, then the Textbook Import Wizard with a real PDF.

## Other Manual Steps Required (Supabase)
- [ ] **Supabase URL config** — Auth → URL Configuration → set Site URL to Vercel URL, add `/reset-password` to Redirect URLs.

## Previously Blocked SQL — Confirmed Run ✅
- [x] `supabase-teacher-subjects.sql` (DROP+RECREATE version) — teacher portal restored
- [x] `supabase-admin-enroll.sql` — admin auto-enrollment trigger active
- [x] `supabase-study-timer.sql` — study_sessions table live
- [x] `supabase-daily-challenge.sql` — daily challenge live
- [x] Re-assigned teacher unit via `/admin/teachers`

## Next Feature to Build
- [ ] **Notes on lessons** — student per-lesson note-taking (textarea in lesson reader, saved to `lesson_notes` table)

## Later Features
- [ ] **Search** — global search across lessons, quiz questions, flashcards
- [ ] **Discoverability fixes** — add signup hint on login page, add empty-state prompt on teacher dashboard when no students enrolled
- [ ] **Discussions** — teacher/student threads per subject
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
- [ ] **Career avatar picker** — built and pushed; visual rendering in production UNVERIFIED ⚠️
- [ ] **Custom photo upload** — built; blocked by avatars bucket RLS (see top of this file) ⚠️ UNVERIFIED
- [ ] **Settings page (teacher + admin)** — built and pushed; not yet manually verified in each portal ⚠️ UNVERIFIED
- [ ] **Curriculum Builder** — all files built; `supabase-curriculum.sql` NOT YET RUN. Cannot be tested until SQL and bucket are set up. ⚠️ UNVERIFIED
- [ ] **Textbook Import Wizard** — all files built; `supabase-curriculum-import.sql` NOT YET RUN and Anthropic credits required. ⚠️ UNVERIFIED
- [ ] AI question extraction from past papers (`/api/extract-questions`) — requires Anthropic credits
- [ ] Teacher announcements / student notifications — confirm end-to-end
- [ ] Review / Weak Areas — deployed, untested with real data
- [ ] Tutorial spotlight — deployed; untested on real device end-to-end
- [ ] Password reset flow end-to-end (requires Supabase URL config)
- [ ] PWA offline on a real device
- [ ] Modules end-to-end on live site
- [ ] Exam Centre PDF upload on live site
- [ ] Streak increment across real days

## Completed This Session ✅
- **Universal settings system** — `src/components/shared/settings-view.tsx` is a role-aware settings hub serving all three portals. Sections: Appearance (3-way theme), Audio (notification sounds, sound effects), Preferences (leaderboard privacy, streak reminders — student only), App Settings (PWA install, haptic feedback, tutorial reset), Region (timezone label), Help & Support, About.
- **UserMenu dropdown** — `src/components/shared/user-menu.tsx` replaces plain avatar in all three layout headers. Click avatar → dropdown shows user name, email, role badge; links to Profile and Settings; Sign out button. Custom click-outside implementation (not base-ui DropdownMenu) to avoid the `w-(--anchor-width)` CSS width issue.
- **Career avatar system** — `src/lib/career-avatars.ts` defines 14 SVG career avatars: doctor, engineer, teacher, pilot, lawyer, scientist, artist, chef, athlete, programmer, entrepreneur, nurse, architect, vet. Stored as `bims-career:<id>` in `avatar_url`. `resolveAvatarSrc()` converts to data URI at render time — no extra DB columns, no storage bucket needed for career avatars.
- **Profile avatar picker** — inline picker in `src/components/shared/profile-form.tsx`. Camera overlay button toggles picker. Career grid (7 columns on sm+, 4 on mobile). Custom photo upload to Supabase `avatars` bucket (2 MB limit, PNG/JPG/WebP). Graceful error if bucket missing or RLS blocking.
- **Settings pages on all portals** — `/student/settings`, `/teacher/settings`, `/admin/settings` all route to the shared `SettingsView` with role-specific content.
- **Sidebar consolidation** — Profile link removed from all three sidebars. Settings link serves as the entry point; its active state covers both `/settings` and `/profile` paths.
- **TypeScript clean** — `tsc --noEmit` passes with no errors after all changes.
- All changes committed and pushed to master ✅

## Previously Completed ✅
- **Textbook Import Wizard** — teachers upload a full PDF textbook in the Curriculum Builder; AI (Claude Sonnet) extracts a complete unit/topic/lesson outline, teacher reviews and edits the tree, DB shells are created upfront, then lessons are generated one-by-one with resume-on-failure support.
- **Per-lesson PDF import** — "Import from PDF" button in the Lesson Editor for importing a single chapter/section into an existing lesson.
- **Resume on interruption** — `curriculum_import_jobs` table tracks per-lesson `status` in JSONB outline; generation loop skips `done` lessons on resume; retry button resets `failed` lessons.
- **Curriculum Builder (teacher)** — `/teacher/curriculum` full CRUD tree: units, topics, lessons. Inline rename, publish/draft toggle, delete.
- **Lesson Editor** — block-based rich content editor. 9 block types: text, heading, image, video, table, list, callout, divider, file.
- **Curriculum View (student)** — `/student/curriculum` read-only lesson viewer with progress tracking.
- **Quiz launcher lesson recommendations** — results screen shows "Review these lessons" cards for wrong answers with a linked lesson.
- **proxy.ts manifest fix** — PWA installability unblocked.
- Mobile responsive sidebars on all three portals, layout scroll fix, tutorial bug fixes
- Teacher unit selection at signup, teacher portal scoping, admin portal
- Admin auto-enrollment trigger, portal toggles
- Visual enhancements, Study Timer, Daily Challenge, Review / Weak Areas, Notifications
- Full student portal, full teacher portal, password management, PWA phases 1–3, Interactive tutorial
- Geography → Business migration

## Files Changed This Session
- `src/lib/career-avatars.ts` — NEW: 14 career SVG avatars + helper functions (`isCareerAvatar`, `careerAvatarUrl`, `getCareerDataUri`, `resolveAvatarSrc`)
- `src/components/shared/settings-view.tsx` — NEW: role-aware settings hub for all three portals
- `src/components/shared/user-menu.tsx` — NEW: avatar dropdown (profile, settings, sign out)
- `src/app/student/settings/page.tsx` — REPLACED: now routes to shared SettingsView
- `src/app/teacher/settings/page.tsx` — NEW: teacher settings page
- `src/app/admin/settings/page.tsx` — NEW: admin settings page
- `src/components/student/settings-view.tsx` — UPDATED: now just a re-export of the shared component
- `src/components/shared/profile-form.tsx` — UPDATED: career avatar picker + photo upload added
- `src/components/layout/student-sidebar.tsx` — UPDATED: profile link removed; settings link active state covers /profile too
- `src/components/layout/teacher-sidebar.tsx` — UPDATED: profile link removed, settings link added
- `src/components/layout/admin-sidebar.tsx` — UPDATED: profile link removed, settings link with active state
- `src/app/student/layout.tsx` — UPDATED: fetches avatar_url, integrates UserMenu
- `src/app/teacher/layout.tsx` — UPDATED: fetches avatar_url, integrates UserMenu
- `src/app/admin/layout.tsx` — UPDATED: fetches avatar_url, integrates UserMenu
- `src/app/student/profile/page.tsx` — UPDATED: avatar_url added to select query
- `src/app/teacher/profile/page.tsx` — UPDATED: avatar_url added to select query

## Commands to Run Next
```
# All code changes are already committed and pushed to master — Vercel auto-deploys automatically.
# No further git commands needed.
```

Manual (run in Supabase, in this order):
1. Supabase SQL Editor → run the three avatars bucket RLS policies (see top of this file)
2. Supabase SQL Editor → paste and run `supabase-curriculum.sql`
3. Supabase SQL Editor → paste and run `supabase-curriculum-import.sql`
4. Supabase → Storage → New bucket → Name: `lesson-media` → Public: YES
5. Supabase → Auth → URL Configuration → Site URL + /reset-password redirect
6. Add Anthropic billing credits
