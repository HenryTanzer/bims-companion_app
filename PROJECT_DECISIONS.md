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
**Why:** Simplest setup for a school environment where students use school email addresses. No Google/GitHub OAuth required. Email confirmation is disabled for local development to allow immediate testing.
**Pending:** Verify confirmation is still off in production. Enable for production when ready.

### User Roles: student / teacher / admin
**Why:** Three roles cover all use cases. Role is stored in the `profiles` table and enforced in both RLS policies (database level) and `proxy.ts` (route level). Admin role is scaffolded in the DB but has no dedicated portal page yet.

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

### AI Study Buddy: Claude Haiku, Streaming via ReadableStream
**Why:** Claude Haiku (claude-haiku-4-5-20251001) is fast and cheap — suitable for interactive chat. Streaming makes responses feel immediate. The API route uses `MessageStream` from `@anthropic-ai/sdk`, iterates events, and forwards `text_delta` chunks as a plain-text `ReadableStream` to the client. The client reads chunks and appends them to the last assistant message in state.
**Note:** Claude already knows A-Level IT, Business, and Biology content from its training data. No teacher content upload or fine-tuning is required for the AI to work.
**Note:** This feature does not exist in the original bims.bi app — it is an enhancement in our rebuild.

### PDF Storage: Supabase Storage (`past-papers` bucket)
**Why:** Supabase Storage is already in the stack and simplest to integrate. Teacher uploads go to a public bucket named `past-papers`. The public URL is stored in `past_papers.file_url`. Delete removes the Storage object first, then the DB record.
**Status:** Bucket created as public in Supabase dashboard ✅

### Profile Page: Shared Component, Per-Portal Pages
**Why:** Both student and teacher need the same edit form (display name only — email and role are read-only). A single `ProfileForm` client component is reused by both portal pages. Student version additionally shows enrolled subjects (read-only). Teacher version omits that section.

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

### Anthropic API Key: Personal Account for Now, School Account Recommended for Production
**Why:** A personal Anthropic account was used for initial setup. For production school use, a dedicated school account should be created at console.anthropic.com to keep billing and usage separate. Swapping the key requires updating `ANTHROPIC_API_KEY` in Vercel → Settings → Environment Variables and redeploying — no code changes needed.

---

## Decisions Still Pending

| Decision | Options | Notes |
|---|---|---|
| Email confirmation | Enable for production or keep off | Off now for dev convenience; unverified current state in production |
| Anthropic account | Personal vs. dedicated school account | Personal used currently; school account recommended before sharing with students |
| Admin portal | Build full admin UI vs. manage via Supabase dashboard | No admin pages exist yet |
| Type generation | Manual types vs. `supabase gen types` | Manual now; generated types would remove `as any` casts |
| Offline / PWA | Add service worker + manifest for offline use | Not started; relevant for school environments with poor connectivity |
| Teacher messages design | One-to-one vs. broadcast to subject group | Not designed; stub page only |
| Review / Weak areas design | Surface by topic, by question, or by score threshold | Not designed yet |
