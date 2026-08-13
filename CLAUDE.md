# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**لقيتها** (Lageetha) — an Arabic, RTL lost-and-found web app for a university community. Users post a **lost** (`lost`) or **found** (`found`) report; the system auto-matches opposite-type reports, notifies both owners, and opens an in-app conversation **without exposing phone numbers**. Stack: React 18 + Vite + React Router + TanStack Query + Supabase. JavaScript/JSX only — no TypeScript in `src/` (the Edge Function is TS/Deno).

The README (`README.md`) is the authoritative, detailed spec and is written in Arabic — consult it for the full Supabase setup, RLS rules, and matching algorithm. UI, comments, and user-facing strings are Arabic; keep new ones Arabic and RTL-correct.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on `http://localhost:5173` |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the build |
| `npm run lint` | ESLint (config in `.eslintrc.cjs`) |
| `npm run test` | Vitest, single run |
| `npm run test:watch` | Vitest watch mode |

Run a single test file: `npx vitest run src/lib/matching.test.js`. Filter by name: `npx vitest run -t "score"`.

## Demo mode vs. real Supabase — the central architectural fact

The app runs fully **without any backend**. If `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are unset (or `VITE_DEMO_MODE=true`), `src/lib/supabase.js` leaves the client `null` and every operation falls back to an in-memory/`localStorage` demo store (`src/lib/demo/`). All screens work with seeded data; any 8-char password logs into the demo account.

- **`src/lib/api.js` is the only data layer.** Every hook goes through it; no component or hook talks to Supabase directly. Each function has two branches — real Supabase when configured, demo store otherwise — so the UI never changes between modes. Add new data operations here, implementing **both** paths.
- `api.js` also owns `toUserMessage()`, which converts Supabase error codes into Arabic user strings. Technical error text must never reach the UI.
- The single Supabase client lives in `src/lib/supabase.js`. Never create another client inside a component or hook.

**Tests always run in demo mode** — `vite.config.js` blanks the Supabase env vars for Vitest, so results don't depend on a developer's local `.env` and never touch a real project.

## Matching logic exists in two places — keep them in sync

Scoring compares opposite-type reports within a ±7-day window and weights category (30) + place (30, trigram similarity) + date (20) + title (10) + description (10), out of 100; ≥70 creates a `suggested` match + notifications.

- **Production:** computed in PostgreSQL (`public.match_candidates`, using `pg_trgm`), triggered by a Database Webhook → the `supabase/functions/match-report/` Edge Function on report INSERT. Weights read from the `match_settings` table, falling back to `config.ts`.
- **Demo/tests:** a mirrored JavaScript implementation in `src/lib/matching.js`, which is what the unit tests exercise.

If you change the algorithm or weights, update **both** the SQL/Edge Function and `src/lib/matching.js`, or they will diverge.

## Security model (enforced in the database, not the UI)

RLS is on for every table. Do not rely on frontend checks for any of these — they are guaranteed by DB triggers and policies (see `supabase/migrations/`):

- Phone/email live in `profile_contacts` (owner-only), **not** in the public-readable `profiles`.
- Conversation membership is set only via `start_conversation()` / `confirm_match()`; no one can insert themselves into `conversation_members`.
- `guard_match_score` reverts any user-session change to a match's `score`/`breakdown`; inserts are `service_role`-only.
- `guard_role` blocks non-admin changes to `profiles.role`.
- `service_role` must never appear in `src/`.

## Conventions

- Routing: all screens are `React.lazy` under `<Suspense>` in `src/App.jsx`; the only auth guard is `src/components/ProtectedRoute.jsx`.
- TanStack Query keys live **only** in `src/lib/queryKeys.js`.
- Realtime subscriptions must be cleaned up on unmount. Optimistic messages dedupe by `client_id` (the incoming row replaces the optimistic one).
- Search-filter state lives in URL query params (shareable, survives back-nav) via `src/hooks/useReportFilters.js`.
- Styling: all colors are CSS custom properties in `src/styles/tokens.css`; component/base rules in `src/styles/base.css`. No hardcoded colors. Secondary accent `#d6006c` = lost reports, primary `#0088b0` = found. Fonts: Amiri (headings), Noto Naskh Arabic (body). `<html lang="ar" dir="rtl">`.
- No `alert()` / `confirm()` anywhere — confirmations go through the `Dialog` UI component. Accessibility (WCAG AA contrast, ≥44px touch targets, keyboard nav, focus trap, `prefers-reduced-motion`) is a maintained invariant.
