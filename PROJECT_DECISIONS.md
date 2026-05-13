# PROJECT_DECISIONS.md

## Decisions Made

### Framework: Next.js 16 App Router
**Why:** File-based routing, server components for fast data fetching, easy Vercel deployment, built-in TypeScript support. App Router allows layouts to be shared across page groups without prop drilling.
**Note:** Next.js 16 renamed `middleware.ts` → `proxy.ts` and the exported function must be named `proxy`. This is already implemented.
**Note:** Dynamic route `params` is now a `Promise` in Next.js 16. Always `const { id } = await params` in async server components.
**vs Vite:** The original bims.bi app uses Vite + React (SPA). Next.js was the right choice here because API routes are needed to protect Anthropic and Supabase service-role keys server-side. A Vite SPA would have required a separate backend. Next.js also gives faster first loads via server-rendered HTML — important for users on slow connections.

### Database: Supabase
**Why:** Provides PostgreSQL, auth, realtime, file storage, and edge functions in one service with a generous free tier. Row Level Security (RLS) means security rules live in the database, not just in application code. Eliminates need for a separate backend server.

### Styling: Tailwind CSS v4 + shadcn/ui
**Why:** Tailwind v4 is installed by default with Next.js 16. shadcn/ui provides unstyled-but-complete components (Card, Badge, Tabs, Select, etc.) that are copied into the project and fully customisable. Dark/light mode is handled via `next-themes` with the `class` strategy.

### Auth: Supabase Email Auth (no OAuth)
**Why:** Simplest setup for a school environment where students use school email addresses. No Google/GitHub OAuth required. Email confirmation is disabled for dev convenience and is currently off in production.
**Pending:** Enable email confirmation in Supabase Auth for production when ready.

### User Roles: student / teacher / admin
**Why:** Three roles cover all use cases. Role is stored in the `profiles` table and enforced in both RLS policies (database level) and `proxy.ts` (route level).
**Admin access:** In `proxy.ts`, `/admin/*` routes require `role === 'admin'`. Non-admins are redirected to `/`. `redirectByRole` sends admins to `/admin`. Admins can freely visit `/teacher/*` and `/student/*` as well. Interim: create admin users manually via Supabase → profiles table, set `role` to `admin`.

### Subjects: Hardcoded to IT, Business, Biology
**Why:** The school runs these three A-Level subjects. The `subjects` table has a CHECK constraint limiting names to these three values. If new subjects are needed, this constraint must be updated in the DB and the TypeScript `SubjectName` type updated.
**History:** The third subject was originally Geography and was changed to Business in session 3.

### XP System
**Why:** Gamification increases student engagement. Rates chosen to feel achievable:
- +10 XP per correct quiz answer
- +25 XP bonus for a perfect quiz score
- +5 XP per flashcard reviewed
- +10 XP per correct module answer
- +35 XP for correct Daily Challenge answer
- +5 XP for Daily Challenge participation (wrong answer)
- +1 XP per minute for Study Timer (awarded on full session completion only)
- Level threshold: 100 XP per level

All XP/streak/level updates go through `src/lib/progress.ts` → `updateStudentProgress()`, except the Daily Challenge API route which inlines the same logic using the server Supabase client.

### Spaced Repetition: Simplified SM-2 Variant
**Why:** Full SM-2 algorithm is complex. A simplified 4-bucket system (Again=1d, Hard=3d, Good=7d, Easy=14d) achieves the core benefit without added complexity. Stored in `flashcard_reviews.next_review_at`.

### TypeScript Database Types: Manual (not generated)
**Why:** Supabase CLI type generation requires Docker or a local Supabase instance. To avoid that setup, types were written manually in `src/types/database.ts`. As a result, some Supabase query return types resolve to `never` and require `(supabase as any).from(...)` casts.
**Pattern:** Always cast the client — `(supabase as any).from(...)` — not the argument `{...} as any`.
**Pending:** Consider switching to generated types (`npx supabase gen types typescript`) once the schema is stable.

### Subject Enrolment: Locked at Signup, Teacher-Managed Thereafter
**Why:** Students choose their A-Level subjects once at the start of the year. Allowing free self-service switching would create data inconsistencies. Teachers are the authority on class membership.
**Implementation:** Students select subjects on the signup page. Teachers use the `StudentEnroller` component on `/teacher/students` to add or remove enrolments.

### Teacher Unit Assignment: Single-Select at Signup, Stored in `teacher_subjects`
**Why:** Teachers only cover one subject. A confirmation dialog at signup makes the single-select constraint explicit.
**Implementation:** On signup, teachers choose their subject. An amber confirmation box appears before submit. On success, a row is inserted into `teacher_subjects (teacher_id, subject_id)`.
**Reassignment:** Admins can reassign via `/admin/teachers`. Deletes existing rows and inserts the new one.
**Schema:** `teacher_subjects` table — RUN ✅.

### Teacher Portal Scoping: `getTeacherContext()` Helper
**Why:** All teacher pages needed to filter data to the teacher's assigned subjects. A shared server-side helper called independently at the top of each page avoids prop drilling.
**Implementation:** `src/lib/teacher-subjects.ts` exports `getTeacherContext(supabase, userId)` → `{ role, subjectIds, isAdmin }`. Each teacher page wraps queries with: `isAdmin ? all data : subjectIds.length > 0 ? filtered : Promise.resolve({data:[]})`.

### Admin Portal: Dedicated `/admin` Route Group
**Why:** Admins need school-wide visibility and user management that teachers should not have.
**Design:** Three pages — dashboard, users (role changes), teachers (unit reassignment), settings. Route guard in `proxy.ts` blocks non-admins.

### Admin Auto-Enrollment: DB Trigger
**Why:** Admins need to see data across all subjects automatically.
**Schema:** `supabase-admin-enroll.sql` — RUN ✅.

### Mobile Responsiveness: Hamburger Drawer Pattern
**Why:** The sidebar was hardcoded at 256px with no mobile handling. On phones it consumed the entire screen.
**Implementation:** Each sidebar (student, teacher, admin) manages its own `open` state. On mobile (`< md`): sidebar is `fixed inset-y-0 left-0 z-50` and translates off-screen when closed. A `fixed top-3 left-3 z-40 md:hidden` hamburger button opens it. A `fixed inset-0 bg-black/50 z-40` backdrop closes it on tap. Nav links also close it on tap.
**Layout topbar:** `pl-14 pr-4 md:px-6` — reserves space for the hamburger on mobile.
**Main content:** `p-4 md:p-6` padding. No `flex-1` on `<main>`.
**Outer container:** `flex items-start min-h-screen`. `items-start` is critical — without it, the sidebar's `min-h-screen` locks the outer container to exactly 100vh, the content wrapper stretches to match, and any content taller than the viewport is unreachable (no document scroll). This was causing the change password and tutorial sections to be invisible on the teacher profile page.
**Sidebar event listeners:** Each sidebar listens for `bims:open-sidebar` (opens on mobile) and `bims:close-sidebar` (closes on mobile). Fired by `TutorialController` when the tour starts/ends.

### Tutorial System: Per-Portal Keys, Mobile-Aware
**Why:** The original shared key (`bims_tutorial_v1`) meant completing or skipping either portal's tour permanently blocked the other. Separate keys allow each portal to show its tour independently.
**Keys:** `bims_student_tutorial_v1`, `bims_teacher_tutorial_v1`.
**Mobile:** When tutorial launches on mobile, `bims:open-sidebar` is fired first, then a 350ms delay before the modal mounts. This allows the sidebar's 300ms slide-in animation to complete before `getBoundingClientRect()` measures nav item positions.
**Tooltip on mobile:** Always `fixed bottom: 16, left: 8, right: 8` — full width, anchored to bottom of screen. On desktop, tooltip positions relative to the highlighted element.
**Why bottom-anchored on mobile:** The sidebar is 256px wide. Right-positioning calculated `left: ~274px` on a ~390px screen, pushing the 300px-wide tooltip off-screen.
**Relaunch:** Settings → App Settings → Reset tutorial. Clears the localStorage key and fires `bims:launch-tutorial`.

### No Separate Backend / API Routes (except AI and Daily Challenge)
**Why:** Supabase handles all data operations directly from the client or server components. API routes exist for:
- `/api/study-buddy` — Anthropic SDK must run server-side to protect the API key
- `/api/extract-questions` — Anthropic SDK + PDF fetch must run server-side
- `/api/daily-challenge` — correct answer must never be sent to client
- `/api/parse-textbook` — single-lesson PDF import (Anthropic SDK server-side)
- `/api/curriculum/extract-outline` — textbook outline extraction (Anthropic SDK server-side)
- `/api/curriculum/generate-lesson` — per-lesson generation: blocks + quiz questions + flashcards (Anthropic SDK server-side)

### AI Study Buddy: Claude Haiku, Streaming, Strict Subject Guardrails
**Why:** Claude Haiku (claude-haiku-4-5-20251001) is fast and cheap. Strict RULES in the system prompt — AI only discusses the student's selected A-Level subject, refuses all off-topic requests with a fixed response.

### AI Question Extraction: Claude Sonnet, PDF Document Block
**Why:** Teachers upload past papers as PDFs. Claude Sonnet reads the PDF and extracts structured MCQ data. `/api/extract-questions/route.ts`.

### Curriculum Builder: Built ✅ (SQL not yet run — unverified)
**Why:** Teachers need a structured content hub that replaces textbooks — lessons with rich media, not just MCQs. Most-requested missing feature from teacher feedback.
**Data model:** 3-level hierarchy — Unit → Topic → Lesson. Year grouping (`Year 12 | Year 13 | Both`) is a badge on units, not a separate hierarchy level.
**Block-based content editor (custom, not TipTap/Quill):** Chose a custom block editor because TipTap adds ~100KB and its customisation API is complex. The lesson structure is known upfront (9 block types: text, heading, image, video, table, list, callout, divider, file) so a custom form-per-block approach is simpler and produces clean JSONB output.
**Content stored as JSONB:** `curriculum_lessons.content` is a `jsonb` column holding a `ContentBlock[]` array. This allows adding block types without schema migrations. TypeScript's discriminated union (`ContentBlock`) provides type safety app-side.
**`BlockWithId` pattern:** Each block has a `_id` string (random, client-only) for React key management. `_id` is stripped before saving to the DB.
**`lesson-media` Supabase Storage bucket:** Public bucket (no signed URL overhead). Bucket must be created manually in Supabase dashboard — Storage → New bucket → `lesson-media` → Public: YES.
**Lesson resource linking:** Quiz questions and flashcards can be linked to lessons via a "Linked Resources" tab in the lesson editor (lazy-loaded on first click). Linking sets `lesson_id` on the question/flashcard row.
**Quiz lesson recommendations:** After a quiz, the results screen shows "Review these lessons" cards for any wrong answer whose question has a `lesson_id`. Cards link to `/student/curriculum`.
**RLS design:** Two separate SELECT/ALL policies on `curriculum_lessons` OR'd together — `teacher_all` (FOR ALL, checks `teacher_subjects` or `is_admin`) and `student_select` (FOR SELECT, checks `is_published = true` AND enrolled).

### Content Manager vs Curriculum Builder
**Why they are different:**
- **Content Manager** (`/teacher/content`) — form for adding individual MCQ questions, flashcards, and topics. Feeds the quiz/flashcard engines.
- **Curriculum Builder** (`/teacher/curriculum`) — structured content tree: Unit → Topic → Lesson. Teachers author rich lesson content. Students navigate as their course map.

### PDF Storage: Supabase Storage (`past-papers` bucket)
Already public, already created. ✅

### Profile + Settings Architecture: Settings as Hub (added 2026-05-13)
**Why:** The original design had a separate "Profile" sidebar link in addition to a "Settings" link. This was redundant — profile editing is a subset of account management, not a separate top-level destination.
**Decision:** Profile link removed from all three sidebars. Settings is the single entry point. Settings → Account section → Profile opens the profile page. The Settings link's active state covers both `/settings` and `/profile` paths so it stays highlighted when the user is on the profile page.
**Shared settings component:** `src/components/shared/settings-view.tsx` serves all three portals. Role-aware: student-only sections (leaderboard privacy, streak reminders, study timer link) do not appear for teachers or admins.
**Admin basePath:** Admin users share the teacher profile page (`/teacher/profile`). Admin settings uses `basePath="/teacher"` to drive the Profile navigation link correctly.

### UserMenu Dropdown: Custom Implementation (added 2026-05-13)
**Why custom instead of base-ui DropdownMenu:**
`src/components/ui/dropdown-menu.tsx` uses `@base-ui/react/menu`. It applies `w-(--anchor-width)` CSS variable to the popup, which sets the popup width equal to the trigger element (the 32px avatar). Overriding this with CSS specificity was fragile.
**Decision:** Built a custom dropdown in `src/components/shared/user-menu.tsx` using `useRef<HTMLDivElement>` + `useEffect` mousedown listener for click-outside detection. No dependency on base-ui for this pattern.
**Content:** User info header (name, email, role badge with colour), Profile link, Settings link, Sign out button. ChevronDown rotates on open.

### Career Avatar System: bims-career Scheme, SVG in TypeScript (added 2026-05-13)
**Why career avatars:** Students pick a career path avatar to personalise their profile and signal their ambitions. 14 SVG career avatars cover common BIMS School aspirations (doctor, engineer, teacher, etc.).
**Why not image files:** Static SVG files in `public/` would require a deploy for every new avatar. Defining SVGs as TypeScript strings in `src/lib/career-avatars.ts` keeps them code-controlled and avoids an extra storage bucket.
**Storage scheme:** `avatar_url = "bims-career:<id>"` — uses the existing `avatar_url` column. No new DB column required. The `bims-career:` prefix is a namespace, not an actual URL.
**Resolution:** `resolveAvatarSrc(url)` is the single point of conversion. Returns `null` for null input, a `data:image/svg+xml;charset=utf-8,...` data URI for career avatars, or the raw URL for custom uploads. All rendering code calls this before passing to `<AvatarImage src>`.
**SVG design constraints:** Each avatar is a 100×100 viewBox with a coloured circle background and white icon. Icon is the inner SVG content only (no outer `<svg>` tag). The `wrap(color, icon)` function assembles the full SVG string.

### Custom Photo Upload: Supabase `avatars` Bucket (added 2026-05-13)
**Why:** Students and teachers may prefer their own photo over a career avatar.
**Implementation:** `src/components/shared/profile-form.tsx` uploads to `avatars/${profile.id}.{ext}` with `upsert: true`. Cache busting via `?t=${Date.now()}` appended to the public URL before saving.
**RLS requirement:** The `avatars` bucket requires separate INSERT, UPDATE, and SELECT policies on `storage.objects`. Without the INSERT policy, uploads fail with a generic "Failed to upload image" error. The code catches the "Bucket not found" error separately and surfaces a helpful message.
**2 MB limit:** Enforced client-side (`file.size > 2 * 1024 * 1024`) before the upload attempt.

### Settings Toggles: Custom Toggle Component, Not shadcn Switch (added 2026-05-13)
**Why:** `src/components/ui/` does NOT have `switch.tsx`. Rather than add it (which brings shadcn dependencies), a minimal custom `Toggle` component was defined inline in `settings-view.tsx`. It is a `<button role="switch" aria-checked={checked}>` with a sliding inner `<span>`. Accessibility-correct and visually identical to a switch.
**Not extracted to ui/:** The toggle is only used in settings. Extracting it would be premature. If it's needed elsewhere later, move it then.

### Settings State: localStorage Only (added 2026-05-13)
**Why not DB:** Settings like notification sounds, haptic feedback, and leaderboard privacy are device preferences, not account data. Storing them in localStorage avoids a round-trip to Supabase on every page load and keeps them local to the device (appropriate for device-level preferences like sound/haptic).
**Keys used:**
- `bims_notification_sounds` — notification sounds on/off
- `bims_sound_effects` — UI sound effects on/off
- `bims_haptic_feedback` — haptic feedback on/off (navigator.vibrate)
- `bims_leaderboard_visible` — leaderboard privacy (student only)
- `bims_streak_reminders` — streak reminder toggle (student only)
- `bims_browser_notifs` — browser notification permission state

### Password Management: Three Flows
1. **Change password (logged in):** `supabase.auth.updateUser({ password })`.
2. **Forgot password:** `/forgot-password` → `supabase.auth.resetPasswordForEmail()`.
3. **Reset password (from email link):** `/reset-password` listens for `PASSWORD_RECOVERY` event.
**Supabase URL config required:** Site URL + `/reset-password` in Redirect URLs.

### Modules/Assignments System
Three tables: `modules`, `module_questions`, `module_submissions`. All with RLS.
`supabase-modules.sql` already run ✅. End-to-end not yet tested in production.

### Daily Challenge: Server-Side Answer Checking
Answer never sent to client before submission. Server page strips `correct_answer`. Deterministic by date. `UNIQUE(student_id, challenge_date)` prevents double submission.
`supabase-daily-challenge.sql` RUN ✅.

### Study Timer: Client Component, XP on Full Completion Only
15/25/45/60 min presets. 1 XP/min awarded only on full completion. SVG countdown ring.
`supabase-study-timer.sql` RUN ✅.

### PWA: Custom Service Worker (not a plugin)
**Why:** `@ducanh2912/next-pwa` and `vite-plugin-pwa` both have compatibility issues with Next.js 16. Custom `public/sw.js` was chosen deliberately. Do NOT add either plugin.
Three phases all built: manifest, service worker, offline reads (IndexedDB), write queue + sync.

### proxy.ts Matcher: Static Assets Excluded
**Why:** The middleware matcher must exclude static files so unauthenticated browsers can fetch them. Fixed to also exclude `sw.js` and `manifest.webmanifest` — without this, the browser received login-redirect HTML instead of the PWA manifest, breaking PWA installability.
**Current exclusion pattern:** `favicon\\.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$`

### No Opening Animation
**Why:** The time-to-useful-content gain from skipping an animation outweighs the "cool factor" for a school productivity tool. Decision: defer indefinitely.

### OpenAI Codex Collaboration Strategy
**Why:** Pro subscription enables parallel AI-assisted development. Claude Code and Codex can work simultaneously without conflicts if isolated to separate git branches.
**Pattern:** Create a feature branch for Codex (`git checkout -b codex/feature-name`). Claude Code works on `master` or its own branch. Merge via PR, resolve conflicts manually. Do NOT have both AIs edit the same file at the same time.
**Risk:** Neither AI knows what the other has changed. Keep branch lifetimes short. Review every Codex PR against current `master` before merging.

### Deployment: Vercel
Push to master triggers automatic redeploy. After changing env vars in Vercel Settings, a manual redeploy is required.

### School Logo
`public/logo.png`. Wrapped in `bg-white rounded-xl p-0.5` container so black line-art logo is always visible in dark mode.

---

### AI Textbook → Full Curriculum Import: Built ✅ (SQL not yet run — unverified)
**Why:** Core mission of the app is to replace textbooks. AI parsing converts a full PDF textbook into an entire curriculum — units, topics, lessons, quiz questions, and flashcards — in one workflow.
**Architecture:**
1. Teacher uploads PDF to `lesson-media/textbook-imports/` (Supabase Storage, browser client). URL stored on `curriculum_import_jobs.file_url`.
2. `/api/curriculum/extract-outline` — fetches PDF from storage URL, sends to Claude Sonnet, returns unit/topic/lesson outline. Creates `curriculum_import_jobs` row.
3. Teacher reviews and edits the outline tree.
4. Browser creates DB shells sequentially: `curriculum_units`, `curriculum_topics`, `curriculum_lessons` rows with empty content. Populates `outline` JSONB with `db_id` fields and `status: 'pending'`.
5. `/api/curriculum/generate-lesson` — called once per lesson. Saves blocks, quiz questions, flashcards to DB. Marks lesson `status: 'done'` in outline JSONB.
6. Resume: teacher re-uploads the same PDF. Wizard detects `existingJob.outline`, skips extraction, runs generation from first `status !== 'done'` lesson.
**Constraints:**
- Vercel body limit (~4.5MB): never send PDF as base64 in request body. Always upload to storage first and pass the URL.
- `maxDuration = 120` required on extract-outline and generate-lesson routes.
**Status:** BUILT 2026-05-13. `supabase-curriculum-import.sql` not yet run. Anthropic credits required.

---

## Decisions Still Pending

| Decision | Options | Notes |
|---|---|---|
| Email confirmation | Enable for production or keep off | Off now; enable before opening to full student body |
| Anthropic account | Personal vs. dedicated school account | Personal used currently; school account recommended |
| Custom domain | School domain vs. Vercel subdomain | Not set up |
| Type generation | Manual types vs. `supabase gen types` | Manual now; generated types would remove `as any` casts |
| Notes on lessons | Per-lesson student note-taking | Small feature, high value for revision; next in agreed build order |
| Search | Global search across lessons, questions, flashcards | Medium build |
| Discussions | Teacher/student threads per subject | Later feature |
| Multi-tenancy | Add `school_id` to all tables | Required before selling to a second school |
| Discoverability | Login page signup hint + teacher dashboard empty-states | Quick wins |
