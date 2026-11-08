# Progress: Barber Booking System

Last updated: 2026-11-07. Source of requirements: `Barbershop Booking System PRD.md`.

## Where we are

Phase 1 (the core slice) is **done and verified**. Next up is the backend for the remaining phases, then the UI.

Verified on 2026-11-07:
- `npm test`: 2 files, 53 tests passed (89s; runs against the hosted dev database).
- `npm run e2e`: the two-clients race test passed.
- Manual: the booking form at `/b/demo-shop` works; magic-link login email works and lands on `/app/day`.
- `npm run build`, `npm run typecheck` and `npm run lint` are clean. Supabase advisors show only INFO notes.

## How to run and test

Shell: PowerShell, from the repo root.

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in (already done on this machine).
3. Supabase dashboard > Authentication > URL Configuration: Site URL `http://localhost:3000`, Redirect URL `http://localhost:3000/**` (done).
4. Create a staff login: `npm run staff:add -- you@example.com demo-shop owner Carlos`
5. `npm run dev`, then open:
   - `http://localhost:3000/b/demo-shop`: public booking page (English/Spanish)
   - the cancel/change link shown after booking (`/m/<token>`)
   - `http://localhost:3000/login`, then `/app/day`: the Barber day view
6. `npm test` (unit + engine tests), `npm run e2e` (Playwright race test; starts the dev server itself).

## Stack and key decisions

- **Next.js 16.4** (App Router, `cacheComponents` on; `src/proxy.ts` replaces middleware). Read `node_modules/next/dist/docs/` before using a Next API: this version differs from older ones.
- **Supabase (hosted), one project, `barber-booking-dev`**, shared by the app and the tests. Postgres with row-level security on every table; email magic-link login.
- **postgres.js** for the booking engine (`DATABASE_URL`, session pooler, `prepare: false`); supabase-js for logged-in, RLS-scoped reads.
- **Time:** stored in UTC, shown in America/New_York, DST-safe (`@date-fns/tz`).
- **Spanish/English:** our own small dictionary (`src/lib/i18n`), not `next-intl`.
- **Bot protection:** Cloudflare Turnstile (test keys in dev).
- **"Any available Barber"** = the free Barber with the fewest Bookings that day (ties: sort order, then id).
- **Pending SMS registration:** a Shop goes live anyway; the confirmation screen shows the cancel/change link. A per-Shop `sms_enabled` flag turns texts on later.
- **No double booking:** enforced by a database exclusion constraint, plus a per-Barber advisory lock that prevents deadlocks under heavy load.
- **Outbox pattern:** the engine writes every text, alert and refund request as a row in `outbox` in the same transaction. Nothing sends them yet (that is phase B1).
- Deviations from the first plan: booking transaction is in TypeScript (not a plpgsql function); custom i18n; one database instead of separate dev and test.

## What exists (file map)

| Area | Files |
|---|---|
| Database | `supabase/migrations/*` (schema, RLS, split policies), `supabase/seed.sql` (demo shop "Fresh Cuts Barbershop": Carlos, Dre, Maya; 5 Services) |
| Booking engine | `src/server/booking-engine/` (`index.ts` operations, `availability.ts` slot math, `time.ts`, `errors.ts`), `src/server/db.ts`, `src/server/engine.ts` |
| Public booking | `src/app/b/[shopSlug]/`, `src/app/api/availability/route.ts`, `src/components/slot-picker.tsx`, `turnstile.tsx` |
| Manage booking | `src/app/m/[token]/` (cancel / change time, cutoff rule) |
| Login | `src/app/login/`, `src/app/auth/callback`, `src/app/auth/signout`, `src/lib/supabase/`, `src/proxy.ts` |
| Barber day view | `src/app/app/day/` (arrived / no-show, walk-in, cancel; Owner can switch Barbers) |
| Scripts | `scripts/add-staff.mjs` (`npm run staff:add`) |
| Tests | `tests/unit/availability.test.ts` (13), `tests/engine/booking-engine.test.ts` (40, incl. race, deadlock and RLS), `tests/e2e/race.spec.ts` |

## Known issues to fix later

- The "Book now" button on the booking form needs fixing (reported 2026-11-07; details to confirm tomorrow).
- Supabase's built-in email sender is rate-limited; login emails will move to Resend.

## Decisions for B2 (payments), from 2026-11-07

1. **Hold while paying online: 10 minutes.** An online Booking is saved as "awaiting payment" and blocks the time for 10 minutes. If payment does not arrive in time, the hold is released and the checkout is expired. If a payment still arrives after the release, it is refunded automatically. (Stripe Checkout sessions can't be set to expire in under 30 minutes, so we expire the session ourselves when the hold ends.)
2. **Rescheduling keeps the original payment**, only for Bookings paid online upfront.
3. **Stripe is for testing only.** We will switch to a different payment provider later, so the Payments module goes behind a provider-neutral interface (an adapter). Only the adapter knows Stripe.
4. **Refunds are always in full** (the whole price goes back to the Client; processing fees are not deducted from the Client).

## Accounts to create (needs you; I can't sign up on your behalf)

| Service | Used for | What to get | Status |
|---|---|---|---|
| Resend (resend.com) | Login emails, Barber email alerts, daily Owner email | API key; later a verified sending domain | Chosen, not created |
| Stripe (dashboard.stripe.com), **test mode** | Online payments while testing (Connect enabled) | Secret test key `sk_test_...`; webhook secret via Stripe CLI | Not created |
| Telegram | Barber alerts | Message @BotFather > `/newbot` > bot token | Not created |
| Twilio (twilio.com) | Client texts | Account SID and auth token; per-Shop subaccounts and A2P 10DLC registration come later | Not created |
| Vercel | Deploy and scheduled jobs (cron) | Account linked to the GitHub repo | Not created |

Paste keys only into `.env.local` (placeholders are in `.env.example`), never into chat. When a phase needs an account, we'll script the setup steps with `/wizard`.

## Workflow (from /mattpocock-skills:ask-matt)

Main flow, one cycle per phase:
1. Once: `/setup-matt-pocock-skills`, with local markdown tickets under `.scratch/` (no GitHub CLI on this machine).
2. `/grill-with-docs`: settle open questions; writes `GLOSSARY.md` and decision records.
3. `/to-spec`, then `/to-tickets` (keep steps 2–3 in one session).
4. `/implement <ticket>`, then `/clear`, one ticket at a time (tests first, then code review and commit).
5. `/retro` at the end of each phase.

Backend tickets are checked by tests at the server boundary (engine, route or webhook); screens come in the UI phases.

## Remaining plan

Backend first:
- **B1 Sending worker + scheduled jobs.** Sends outbox rows with retries and a failure log; fake senders in tests; cron routes for sending and the 2-hour reminders. No accounts needed. Everything below depends on it.
- **B2 Payments.** Provider-neutral Payments module with a Stripe test adapter: Connect onboarding, checkout with the 10-minute hold, webhook that ignores repeated events, full refunds, refund-failure alert to the Owner. (B1)
- **B3 Client texts (Twilio).** Confirmation, reminder, cancelled and moved texts; STOP handling. (B1)
- **B4 Alerts.** Telegram linking with Resend email fallback; daily Owner email; move login emails to Resend. (B1)
- **B5 Owner operations + reporting.** Services, prices, specials, hours, closed days, cutoff (warn when over 2h), blocklist, invite/remove Barbers, Bookings per week, time saved, client CSV export. Can run alongside B2–B4.
- **B6 Admin operations.** Create Shop, import client CSV, SMS registration status, free/paid flag, support access log, failures view data, 30-day deletion. (B1, B5)

Then UI:
- **U1** Online payment in the booking flow, plus the "Book now" button fix (B2)
- **U2** Owner settings and dashboard (B5)
- **U3** Barber profile, hours, Connect Telegram (B4, B5)
- **U4** Admin panel (B6)
- **U5** Sentry, e2e journeys 1 and 2, Vercel deploy

## Tomorrow: start here

1. Create the GitHub repo `Barber-booking-system` and push (commands at the bottom).
2. Run `/setup-matt-pocock-skills`.
3. Run `/grill-with-docs` for B1 (sending worker).

## Git

Local repo on branch `main`. To publish to GitHub (PowerShell):

```powershell
# Create an empty repo named Barber-booking-system on github.com first (no README, no .gitignore), then:
git remote add origin https://github.com/<your-username>/Barber-booking-system.git
git push -u origin main
```
