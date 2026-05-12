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
**Schema:** `teacher_subjects` table — PARTIALLY RUN. Table and some policies exist. Use DROP POLICY IF EXISTS version (see CLAUDE_HANDOFF.md).
**Known issue:** If a teacher signs up without selecting a unit and the `teacher_subjects` table doesn't exist, the insert fails silently. The teacher exists in `profiles` but has no `teacher_subjects` row. All teacher pages return empty data. Admin must reassign unit after SQL is run.

### Teacher Portal Scoping: `getTeacherContext()` Helper
**Why:** All teacher pages needed to filter data to the teacher's assigned subjects. A shared server-side helper called independently at the top of each page avoids prop drilling.
**Implementation:** `src/lib/teacher-subjects.ts` exports `getTeacherContext(supabase, userId)` → `{ role, subjectIds, isAdmin }`. Each teacher page wraps queries with: `isAdmin ? all data : subjectIds.length > 0 ? filtered : Promise.resolve({data:[]})`.
**Warning:** If `teacher_subjects` table does not exist in the DB, this function will error on every teacher page.

### Admin Portal: Dedicated `/admin` Route Group
**Why:** Admins need school-wide visibility and user management that teachers should not have.
**Design:** Three pages — dashboard, users (role changes), teachers (unit reassignment). Route guard in `proxy.ts` blocks non-admins.

### Admin Auto-Enrollment: DB Trigger
**Why:** Admins need to see data across all subjects automatically.
**Schema:** `supabase-admin-enroll.sql` — NOT YET RUN IN PRODUCTION.

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
**Tooltip on mobile:** Always `fixed bottom: 16, left: 8, right: 8` — full width, anchored to bottom of screen. On desktop, tooltip positions relative to the highlighted element (right/bottom/left/top depending on `tooltipSide`).
**Why bottom-anchored on mobile:** The sidebar is 256px wide. Right-positioning calculated `left: ~274px` on a ~390px screen, pushing the 300px-wide tooltip off-screen. Bottom-anchoring avoids all positional calculations on small screens.
**Profile page relaunch:** "Take the tour" button clears both portal keys and fires `bims:launch-tutorial`.

### No Separate Backend / API Routes (except AI and Daily Challenge)
**Why:** Supabase handles all data operations directly from the client or server components. API routes exist for:
- `/api/study-buddy` — Anthropic SDK must run server-side to protect the API key
- `/api/extract-questions` — Anthropic SDK + PDF fetch must run server-side
- `/api/daily-challenge` — correct answer must never be sent to client

### AI Study Buddy: Claude Haiku, Streaming, Strict Subject Guardrails
**Why:** Claude Haiku (claude-haiku-4-5-20251001) is fast and cheap. Strict RULES in the system prompt — AI only discusses the student's selected A-Level subject, refuses all off-topic requests with a fixed response.

### AI Question Extraction: Claude Sonnet, PDF Document Block
**Why:** Teachers upload past papers as PDFs. Claude Sonnet reads the PDF and extracts structured MCQ data. `/api/extract-questions/route.ts`.

### Content Manager vs Curriculum Builder
**Why they are different:**
- **Content Manager** (`/teacher/content`) — form for adding individual MCQ questions, flashcards, and topics. Feeds the quiz/flashcard engines. Already built.
- **Curriculum Builder** (not yet built) — structured content tree: Subject → Year group → Unit → Chapter → Lesson. Teachers attach lesson materials to each node. Students navigate the tree as their course map. Most-requested missing feature from teacher feedback.

### PDF Storage: Supabase Storage (`past-papers` bucket)
Already public, already created. ✅

### Profile Page: Shared Component, Per-Portal Pages
`ProfileForm` client component reused by both student and teacher portal profile pages. Contains: display name edit, email (read-only), role (read-only), change password, take the tour button, enrolled subjects (students only).

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
`supabase-daily-challenge.sql` NOT YET RUN. ⚠️

### Study Timer: Client Component, XP on Full Completion Only
15/25/45/60 min presets. 1 XP/min awarded only on full completion. SVG countdown ring.
`supabase-study-timer.sql` NOT YET RUN. ⚠️

### PWA: Custom Service Worker (not a plugin)
**Why:** `@ducanh2912/next-pwa` and `vite-plugin-pwa` both have compatibility issues with Next.js 16. Custom `public/sw.js` was chosen deliberately. Do NOT add either plugin.
Three phases all built: manifest, service worker, offline reads (IndexedDB), write queue + sync.

### Deployment: Vercel
Push to master triggers automatic redeploy. After changing env vars in Vercel Settings, a manual redeploy is required.

### School Logo
`public/logo.png`. Wrapped in `bg-white rounded-xl p-0.5` container so black line-art logo is always visible in dark mode.

---

## Decisions Still Pending

| Decision | Options | Notes |
|---|---|---|
| Email confirmation | Enable for production or keep off | Off now; enable before opening to full student body |
| Anthropic account | Personal vs. dedicated school account | Personal used currently; school account recommended |
| Custom domain | School domain vs. Vercel subdomain | Not set up |
| Type generation | Manual types vs. `supabase gen types` | Manual now; generated types would remove `as any` casts |
| Gradebook | Dedicated aggregate page | Next in agreed build order |
| Discussions | Teacher/student threads per subject | 5th in agreed order |
| Curriculum Builder | Subject → Year → Unit → Chapter → Lesson tree | Most-requested missing feature; significant build |
| Multi-tenancy | Add `school_id` to all tables | Required before selling to a second school |
| Discoverability | Login page signup hint + teacher dashboard empty-states | Quick wins; teachers couldn't find registration/enrolment flow |
