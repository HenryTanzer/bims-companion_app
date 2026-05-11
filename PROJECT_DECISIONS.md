# PROJECT_DECISIONS.md

## Decisions Made

### Framework: Next.js 16 App Router
**Why:** File-based routing, server components for fast data fetching, easy Vercel deployment, built-in TypeScript support. App Router allows layouts to be shared across page groups without prop drilling.
**Note:** Next.js 16 renamed `middleware.ts` → `proxy.ts` and the exported function must be named `proxy`. This is already implemented.
**Note:** Dynamic route `params` is now a `Promise` in Next.js 16. Always `const { id } = await params` in async server components.

### Database: Supabase
**Why:** Provides PostgreSQL, auth, realtime, file storage, and edge functions in one service with a generous free tier. Row Level Security (RLS) means security rules live in the database, not just in application code. Eliminates need for a separate backend server.

### Styling: Tailwind CSS v4 + shadcn/ui
**Why:** Tailwind v4 is installed by default with Next.js 16. shadcn/ui provides unstyled-but-complete components (Card, Badge, Tabs, Select, etc.) that are copied into the project and fully customisable. Dark/light mode is handled via `next-themes` with the `class` strategy.

### Auth: Supabase Email Auth (no OAuth)
**Why:** Simplest setup for a school environment where students use school email addresses. No Google/GitHub OAuth required. Email confirmation is disabled for dev convenience and is currently off in production.
**Pending:** Enable email confirmation in Supabase Auth for production when ready.

### User Roles: student / teacher / admin
**Why:** Three roles cover all use cases. Role is stored in the `profiles` table and enforced in both RLS policies (database level) and `proxy.ts` (route level).
**Admin access:** Admin role gets an early `return supabaseResponse` in `proxy.ts` that bypasses all route guards, allowing admins to freely navigate both `/student/*` and `/teacher/*`. They land on `/teacher` after login. Interim: create admin users manually via Supabase → profiles table, set `role` to `admin`.

### Subjects: Hardcoded to IT, Business, Biology
**Why:** The school runs these three A-Level subjects. The `subjects` table has a CHECK constraint limiting names to these three values. If new subjects are needed, this constraint must be updated in the DB and the TypeScript `SubjectName` type updated.
**History:** The third subject was originally Geography and was changed to Business in session 3. The live database was migrated using `supabase-migrate-geography-to-business.sql`.

### XP System
**Why:** Gamification increases student engagement. Rates chosen to feel achievable:
- +10 XP per correct quiz answer
- +25 XP bonus for a perfect quiz score
- +5 XP per flashcard reviewed
- +10 XP per correct module answer
- Level threshold: 100 XP per level

All XP/streak/level updates go through `src/lib/progress.ts` → `updateStudentProgress()`. No inline update logic in components.

### Spaced Repetition: Simplified SM-2 Variant
**Why:** Full SM-2 algorithm is complex. A simplified 4-bucket system (Again=1d, Hard=3d, Good=7d, Easy=14d) achieves the core benefit (harder cards seen sooner) without added complexity. Stored in `flashcard_reviews.next_review_at`.

### TypeScript Database Types: Manual (not generated)
**Why:** Supabase CLI type generation requires Docker or a local Supabase instance. To avoid that setup, types were written manually in `src/types/database.ts`. As a result, some Supabase query return types resolve to `never` and require `(supabase as any).from(...)` casts.
**Pattern:** Always cast the client — `(supabase as any).from(...)` — not the argument `{...} as any`. Casting the argument causes TS2345.
**Pending:** Consider switching to generated types (`npx supabase gen types typescript`) once the schema is stable.

### Subject Enrolment: Locked at Signup, Teacher-Managed Thereafter
**Why:** Students choose their A-Level subjects once at the start of the year. Allowing free self-service switching during the year would create data inconsistencies (quiz history, progress tied to subjects). Teachers are the authority on class membership and can correct mistakes.
**Implementation:** Students select subjects on the signup page. The student dashboard and profile page show enrolled subjects as read-only. Teachers use the `StudentEnroller` component on `/teacher/students` to add or remove enrolments at any time.

### Shared Progress Utility: `src/lib/progress.ts`
**Why:** Both quiz-launcher and flashcard-launcher needed to update XP, level, streak, and `lessons_this_week` after each session. Duplicating this logic caused an off-by-one bug (stale React state on final flashcard). Extracting to a shared utility fixes the bug and prevents drift if the XP formula changes.

### No Separate Backend / API Routes (except AI)
**Why:** Supabase handles all data operations directly from the client or server components. The only API route is `/api/study-buddy` — Anthropic SDK must run server-side to protect the API key.

### AI Study Buddy: Claude Haiku, Streaming, Strict Subject Guardrails
**Why:** Claude Haiku (claude-haiku-4-5-20251001) is fast and cheap — suitable for interactive chat. Streaming makes responses feel immediate. The API route uses `MessageStream` from `@anthropic-ai/sdk`, iterates events, and forwards `text_delta` chunks as a plain-text `ReadableStream` to the client.
**Guardrails (tightened in session 6):** The system prompt uses strict RULES — the AI only discusses the student's selected A-Level subject, refuses all off-topic requests with a fixed response ("I can only help with A-Level [subject]. Please ask your teacher for help with anything else."), ignores persona change attempts and prompt injection. No casual conversation, roleplay, or essay writing. References Pearson Edexcel specification to anchor responses.
**Why strict vs. soft guardrails:** A soft "politely redirect" prompt still engaged with off-topic requests. The fixed refusal message ensures students cannot use the tool as a general AI assistant during study time.
**Note:** Claude already knows A-Level IT, Business, and Biology content. No teacher content upload or fine-tuning is required.
**Note:** This feature does not exist in the original bims.bi app — it is an enhancement in our rebuild.

### PDF Storage: Supabase Storage (`past-papers` bucket)
**Why:** Supabase Storage is already in the stack and simplest to integrate. Teacher uploads go to a public bucket named `past-papers`. The public URL is stored in `past_papers.file_url`. Delete removes the Storage object first, then the DB record.
**Status:** Bucket created as public in Supabase dashboard ✅

### Profile Page: Shared Component, Per-Portal Pages
**Why:** Both student and teacher need the same edit form (display name only — email and role are read-only). A single `ProfileForm` client component is reused by both portal pages. Student version additionally shows enrolled subjects (read-only) and a change password card. Teacher version omits those sections.

### Password Management: Three Flows
**Why:** Students and teachers need a complete password management solution.
1. **Change password (logged in):** A "Change password" card in `profile-form.tsx` calls `supabase.auth.updateUser({ password })`. Validates min 8 chars and confirm-match client-side.
2. **Forgot password:** `/forgot-password` page calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`. Shows a "check your email" confirmation state.
3. **Reset password (from email link):** `/reset-password` page listens for `onAuthStateChange PASSWORD_RECOVERY` event (set `ready = true`), then calls `supabase.auth.updateUser({ password: newPassword })` and redirects to `/login`.
**Supabase URL config required:** Supabase → Auth → URL Configuration must have the Site URL set to the Vercel URL and `/reset-password` added to Redirect URLs. Without this, the email link will not redirect correctly.

### Modules/Assignments System
**Why:** Reviewed original app at bims.bi — Modules is flagged as "Priority" in the Director dashboard. It is the largest functional gap in our rebuild. Teachers create assessments with questions, due dates, and publish them to a subject. Students complete them question-by-question and submit. Teachers view a gradebook of all enrolled students' scores.
**Schema:** Three tables — `modules`, `module_questions` (join table to quiz_questions), `module_submissions`. All with RLS.
**Status:** Code fully built. `supabase-modules.sql` run in live DB ✅. End-to-end not yet tested in production.
**Score computation:** Calculated at submit time via `Object.entries(answers).filter(...)` — not accumulated in state — to avoid stale closure issues.

### Module Score Calculation: Computed at Submit, Not Accumulated
**Why:** Accumulating score in React state during an attempt leads to stale closure bugs (the same issue that caused flashcard XP off-by-one). Instead, the final score is computed once at submit time by iterating over the `answers` record and comparing each to the question's `correct_answer`. This is authoritative and immune to React batching.

### Teacher Analytics: Server Component, No Chart Library
**Why:** All analytics data lives in existing tables (`quiz_attempts`, `user_progress`, `profiles`, `subjects`). No new schema needed. A chart library (e.g. Recharts) was not added to keep the bundle small — per-subject scores are shown as shadcn `Progress` bars instead. If richer charts are needed later, add Recharts at that point.
**What it shows:** Total quiz attempts, average score, active students this week, total XP earned; per-subject attempt count + avg score; top 5 performers (min 3 attempts); last 15 quiz attempts feed.

### Deployment: Vercel
**Why:** First-class Next.js support, free tier covers the school's usage, zero-config deployment from GitHub push, environment variables managed in dashboard.
**Setup:** GitHub repo `bims-companion_app` (private, master branch) connected to Vercel. Root Directory must be empty — the repo root is the app root.
**Redeployment:** Push to master triggers automatic redeploy. After changing env vars in Vercel Settings, a manual redeploy is required.
**Deployment Protection:** Disabled so external users (e.g. school owner, students, teachers) can access the URL without needing a Vercel account.

### Anthropic API Key: Personal Account for Now, School Account Recommended for Production
**Why:** A personal Anthropic account was used for initial setup. For production school use, a dedicated school account should be created at console.anthropic.com to keep billing and usage separate. Swapping the key requires updating `ANTHROPIC_API_KEY` in Vercel → Settings → Environment Variables and redeploying — no code changes needed.

---

### School Logo
**Where:** `public/logo.png` — referenced in login page, signup page, student sidebar, teacher sidebar.
**Rendering:** Wrapped in `bg-white rounded-xl p-0.5` container so the black line-art logo is always visible regardless of dark/light theme.
**Status:** Confirmed working on live site ✅

### PWA / Offline Support: Three Phases (all built)
**Why:** BIMS School is in East Africa where internet connectivity can be unreliable. Students need access to quiz questions, flashcards, and module content offline. Completed work should queue locally and sync automatically when reconnected.

**Phase 1 — PWA Foundation (built ✅):**
- `src/app/manifest.ts` — Next.js 16 native `MetadataRoute.Manifest` (no external package needed)
- `public/sw.js` — service worker: cache-first for `_next/` static assets, network-first with cache fallback for navigation, pre-caches `['/', '/login', '/offline']`, cache name `bims-v1`
- `src/app/offline/page.tsx` — graceful offline fallback page
- `src/components/shared/service-worker-register.tsx` — client component, registers `/sw.js` in `useEffect`, added to root `layout.tsx`
- Students and teachers can install the app to home screen on tablets, phones, and computers

**Phase 2 — Offline Data Reads (built ✅):**
- `src/lib/offline-db.ts` — IndexedDB wrapper (no library), DB name `bims-offline`, version 2, stores: `quiz_questions` (index: subject_id), `flashcards` (index: subject_id), `write_queue` (keyPath: id)
- `src/components/shared/offline-sync.tsx` — on student portal load, fetches enrolled subjects then caches all quiz questions and flashcards to IndexedDB silently
- `quiz-launcher.tsx` and `flashcard-launcher.tsx` — check `navigator.onLine`; if offline, read from IndexedDB instead of Supabase

**Phase 3 — Offline Write Queue + Background Sync (built ✅):**
- `offline-db.ts` adds `enqueueWrite()`, `getAllQueued()`, `removeQueued()` for a `write_queue` IndexedDB store
- Queue entry types (discriminated union): `quiz_attempt`, `flashcard_session`, `module_submission`
- `src/components/shared/offline-queue-sync.tsx` — on mount and on `window.online` event, processes the queue: quiz attempts → Supabase insert + XP update; flashcard sessions → upsert reviews + XP update; module submissions → upsert + XP update. Removes successful entries, leaves failures for retry. Shows `toast.success('X results synced')`.
- `quiz-launcher.tsx`, `flashcard-launcher.tsx`, `module-attempt.tsx` — if offline at submit time, call `enqueueWrite(...)` and show `toast.info('offline — saved, will sync when you reconnect')`
- Added to `src/app/student/layout.tsx` alongside `OfflineSync`

**Offline-only features (acceptable trade-off):** Study Buddy, Leaderboard, Analytics, Teacher content creation. These require live network access.

**PWA manifest approach:** Used Next.js 16 native `MetadataRoute.Manifest` in `src/app/manifest.ts` instead of `@ducanh2912/next-pwa` or a static JSON file. Next.js 16 handles the manifest route natively — no extra package needed.

---

## Decisions Still Pending

| Decision | Options | Notes |
|---|---|---|
| Email confirmation | Enable for production or keep off | Off now; enable before opening to full student body |
| Anthropic account | Personal vs. dedicated school account | Personal used currently; school account recommended before wide student use |
| Custom domain | School domain vs. Vercel subdomain | Not set up; Vercel → Settings → Domains when ready |
| Admin portal | Build full admin UI (agreed) | Admin role has full portal access. Interim: create admins manually via Supabase → profiles table. Portal to include user management, invite system, school-wide analytics. |
| Type generation | Manual types vs. `supabase gen types` | Manual now; generated types would remove `as any` casts |
| Teacher messages design | Broadcast to subject group vs. individual messages | Not designed; stub page only — next feature to build |
| Review / Weak areas design | Surface by topic, by question, or by score threshold | Not designed yet |
