# TODO.md

## Immediate Tasks
- [ ] **Add Anthropic credits** — console.anthropic.com → Billing → add card + credits. Required before Study Buddy works in production. *(manual step)*
- [ ] **Verify email confirmation is off** — Supabase → Auth → Providers → Email → confirm "Confirm email" toggle is OFF *(unverified)*
- [ ] **Test Study Buddy on live site** — send a message, confirm Claude responds *(UNVERIFIED in production)*
- [ ] **Test Modules end-to-end** — teacher creates/publishes module, student attempts and submits, teacher views gradebook *(UNVERIFIED)*
- [ ] **Test Exam Centre PDF upload on live site** — upload a PDF as teacher, confirm it appears for students *(UNVERIFIED)*
- [ ] **Test Profile pages on live site** — verify name update saves for both student and teacher *(UNVERIFIED)*

## Later Tasks
- [ ] Teacher messages — send message to individual student or all students in a subject *(stub page only)*
- [ ] Student notifications — display messages received from teachers
- [ ] Review / Weak areas — student tool surfacing questions previously answered incorrectly
- [ ] Study Timer — timed study sessions with XP reward
- [ ] Daily Challenge — gamified daily prompt (+35 XP)
- [ ] Discussions — teacher/student discussion threads
- [ ] Switch Anthropic key to dedicated school account when ready for full production use
- [ ] Light mode polish — verify all components look correct in light theme
- [ ] Enable email confirmation in Supabase Auth for production (currently off for dev convenience)
- [ ] Consider switching to `supabase gen types typescript` to remove `as any` casts (schema must be stable first)
- [ ] PWA config — add `manifest.json` and service worker for offline support

## Bugs / Issues
- **Student names show as "Unknown" in teacher analytics** — dev data issue (quiz attempts exist without matching profile rows). Will resolve automatically with real student signups. Not a code bug.
- **Streak reset on Monday** — `lessons_this_week` resets if `last_active_date` isn't the same Monday. Logic is in `src/lib/progress.ts`. *(UNVERIFIED — not tested across a week boundary)*
- **Email confirmation status** — Unverified whether it is off in Supabase dashboard. If on, new signups won't work without email access.

## Completed This Session ✅
- Built teacher analytics page (`src/app/teacher/analytics/page.tsx`) — replaced stub with real data: summary stats, per-subject breakdown, top performers, recent quiz activity
- Run `supabase-modules.sql` in Supabase SQL Editor — modules, module_questions, module_submissions tables now exist in live DB ✅
- Created Supabase Storage bucket `past-papers` as public ✅
- Verified signup flow — profile row created with correct role in live DB ✅
- Deployed to Vercel — app is live ✅
- Fixed Vercel Root Directory misconfiguration (must be empty, not a subdirectory path)

## Previously Completed ✅
- Changed third subject from Geography to Business across all files and live database
- Built full Modules/Assignments system (code + SQL)
- AI Study Buddy: streaming Anthropic SDK route + chat UI
- Student Exam Centre: past papers listed by subject, opens PDF
- Teacher Exam Centre: PDF upload to Supabase Storage, delete
- Profile pages: shared ProfileForm, student + teacher portal pages
- Signup page with subject selection and enrollment insert
- Student dashboard, quiz, flashcards, progress, leaderboard
- Teacher content manager, students page, StudentEnroller component
- `src/lib/progress.ts` shared XP/streak/level utility
- TypeScript passing clean (`tsc --noEmit` no errors)

## Files Changed This Session
```
UPDATED:
  src/app/teacher/analytics/page.tsx  — replaced stub with full analytics dashboard
  CLAUDE_HANDOFF.md                   — updated for session 4
  TODO.md                             — updated for session 4
  PROJECT_DECISIONS.md                — updated for session 4
```

## Commands to Run Next
```bash
# Type check (should be clean)
npx tsc --noEmit

# Push changes to production
git add .
git commit -m "your message"
git push
```

Manual steps before next session:
1. Add credits to Anthropic account (console.anthropic.com → Billing)
2. Verify email confirmation is OFF in Supabase → Auth → Providers → Email
