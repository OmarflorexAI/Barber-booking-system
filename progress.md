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

## Remaining plan (summary)

Order: backend phases B1–B6 first, then UI phases U1–U5. "(needs X)" means phase X must be finished first.

Backend first:
- **B1 Sending worker + scheduled jobs.** Sends outbox rows with retries and a failure log; fake senders in tests; cron routes for sending and the 2-hour reminders. No accounts needed. Everything below depends on it.
- **B2 Payments.** Provider-neutral Payments module with a Stripe test adapter: Connect onboarding, checkout with the 10-minute hold, webhook that ignores repeated events, full refunds, refund-failure alert to the Owner. (needs B1)
- **B3 Client texts (Twilio).** Confirmation, reminder, cancelled and moved texts; STOP handling. (needs B1)
- **B4 Alerts.** Telegram linking with Resend email fallback; daily Owner email; move login emails to Resend. (needs B1)
- **B5 Owner operations + reporting.** Services, prices, specials, hours, closed days, cutoff (warn when over 2h), blocklist, invite/remove Barbers, Bookings per week, time saved, client CSV export. Can run alongside B2–B4.
- **B6 Admin operations.** Create Shop, import client CSV, SMS registration status, free/paid flag, support access log, failures view data, 30-day deletion. (needs B1, B5)

Then UI:
- **U1** Online payment in the booking flow, plus the "Book now" button fix (needs B2)
- **U2** Owner settings and dashboard (needs B5)
- **U3** Barber profile, hours, Connect Telegram (needs B4, B5)
- **U4** Admin panel (needs B6)
- **U5** Sentry, e2e journeys 1 and 2, Vercel deploy

## Detailed plan, phase by phase

"Stories" refers to the numbered user stories in the PRD. Each phase follows the workflow above: grill, spec, tickets, implement. The lists below are the starting point for the spec, not final tickets.

### B1: Sending worker and scheduled jobs

Goal: every row the engine writes to `outbox` and `scheduled_messages` actually gets delivered, exactly once, with failures visible.

- **Senders interface** (one small seam): `sendSms`, `sendTelegram`, `sendEmail`, `requestRefund`. In tests and local dev, fake senders record what would have been sent. Real adapters arrive in B2–B4.
- **Dispatcher:** claims pending `outbox` rows with `FOR UPDATE SKIP LOCKED`, routes each by `type`, and marks it sent or failed.
  - Retries with backoff (for example 1, 5 and 30 minutes, then give up).
  - Records `attempts`, `last_error` and `sent_at`.
  - Respects `shops.sms_enabled` and `clients.sms_opt_out`: a skipped text is marked "skipped", not "failed".
- **Reminders:** a job uses `claimDueReminders(now)` (already built) and turns each due reminder into an SMS send. It must stay safe when the job runs twice.
- **Cron routes:** `/api/cron/dispatch` (every minute) and `/api/cron/reminders` (every 5 minutes), protected by `CRON_SECRET`. On Vercel these become `crons` entries; locally they are called by hand or by a test.
- **Migration:** add the status/attempts/error columns to `outbox` if missing, and an index on pending rows.
- **Tests (real DB):**
  - each outbox type reaches the right fake sender
  - a failure retries and then gives up
  - two dispatchers running at once send each row once
  - opted-out and `sms_enabled = false` texts are skipped
  - a reminder is sent once when the job runs twice
- **Done when:** a booking made on `/b/demo-shop` produces fake "sent" records, and the tests are green.
- Stories: 81, 82, 77 (failure data).

### B2: Payments (Stripe test mode, provider-neutral)

Decisions already made: 10-minute hold; reschedule keeps payment only if paid online upfront; Stripe is a test placeholder; refunds always in full.

- **Payments module interface:** `createConnectOnboardingLink(shop)`, `createCheckout(booking)`, `handleWebhook(rawBody, signature)`, `refund(booking)`. Only `payments/stripe-adapter.ts` imports Stripe.
- **Schema:**
  - Add `payment_events` (provider event id, unique), so a repeated event has no second effect.
  - Add booking status `pending_payment` with `hold_expires_at`. It is treated as blocking by the exclusion constraint.
  - Add `shops.payment_account_id` (rename or alias `stripe_account_id`).
- **Flow:**
  1. The Client picks online payment, and the engine creates a `pending_payment` Booking holding the time for 10 minutes.
  2. The Client goes to Checkout. The webhook marks the Booking paid and confirmed, and the outbox gets the confirmation text and the Barber alert.
  3. If the hold expires first, a job releases the Booking and expires the checkout session.
  4. A payment that arrives after the release is refunded in full automatically.
- **Refunds:** the dispatcher handles `refund_requested` rows by calling `refund()`. When a refund fails, the Owner gets an alert and the failure shows in the admin failures data.
- **Connect onboarding:** an Owner-only route creates the onboarding link and a return route stores the account id. Online payment shows only once the account can take charges.
- **Tests:**
  - fake payment adapter for the engine and dispatcher tests
  - webhook replay has no second effect
  - hold expiry frees the Slot
  - a late payment is refunded
  - each cancellation path refunds in full
  - rescheduling keeps payment
  - refund failure raises an Owner alert
  - by hand: the Stripe CLI against test mode
- **Accounts:** Stripe test account with Connect enabled, plus the Stripe CLI for local webhooks.
- Stories: 30, 31, 40, 44, 84, 86; payment parts of 1–28.

### B3: Client texts (Twilio)

- **Adapter:** `sendSms` adapter using the Shop's Twilio subaccount (stored per Shop), with a send log per Shop.
- **Templates:** English and Spanish versions of:
  - confirmation and the 2-hour reminder, both with the manage link and STOP instructions
  - "cancelled" and "time changed", sent when a Barber or Owner acts
  - a refund notice
- **Inbound webhook:** STOP/START/HELP sets `clients.sms_opt_out`. The webhook checks Twilio's signature.
- **Language:** each text is sent in the language the Client booked in. This needs `bookings.locale`, set at booking time.
- **Tests:**
  - fake adapter: the right template, language and link for each event
  - STOP sets the opt-out, and an opted-out Client is skipped
  - signature check rejects forged requests
- **Accounts:** Twilio account. Per-Shop A2P 10DLC registration is a slow, real-world process: start it early for pilot Shops.
- Stories: 44–56 (Client text parts), 65.

### B4: Barber and Owner alerts (Telegram + Resend)

- **Telegram linking:**
  1. The Barber gets a one-time deep link (`t.me/<bot>?start=<token>`), shown as a link and a QR code.
  2. The bot webhook stores the Barber's `telegram_chat_id`.
  3. An unlink option clears it.
- **Alerts:** new Booking, cancellation, time change and online payment. Each alert links to `/app/day?date=...`. If the Barber has no Telegram, or Telegram fails, the alert goes by email through Resend.
- **Daily Owner email:** a cron job at about 7:00 New York time sends yesterday's Bookings and time saved. It needs the reporting queries from B5, or a minimal version built here.
- **Login emails:** move Supabase Auth magic-link emails to Resend SMTP, to get past the built-in rate limit.
- **Tests:**
  - fake adapters: the alert goes to Telegram when linked, and to email when not linked or when Telegram fails
  - the linking token is single-use
  - the daily email has the right numbers for a fixture Shop
- **Accounts:** Telegram bot (BotFather) and Resend (API key, later a verified domain).
- Stories: 49, 53–57.

### B5: Owner operations and reporting

All are server functions with permission checks; screens come in U2/U3.

- **Services:** create, edit and archive; per-Barber price and duration overrides; special price with an end date; cleaning buffer.
- **Hours and days off:**
  - Weekly hours with a break, for any Barber when done by the Owner and for themselves when done by a Barber.
  - Barber days off and Shop closed days. These already exist in the engine; this adds the server actions around them.
- **Cutoff:** change the Shop cutoff, with a warning when it is over 2 hours (PRD assumption 3).
- **Blocklist:** add and remove blocked phone numbers.
- **Barbers:** invite by email (magic link, membership, barber row) and remove. Removal deactivates the Barber and keeps their history. Future Bookings must be cancelled or moved first.
- **Barber profile:** photo, bio, specialties and a gallery of 3–6 photos, using Supabase Storage for uploads.
- **Reporting:** Bookings per week, and time saved (online Bookings × the Shop's manual-booking minutes). No-shows are stored but not counted as success.
- **Export:** client CSV export for the Owner.
- **Tests:**
  - RLS and role checks: a Barber can't change prices or see other calendars
  - the over-2h cutoff warning
  - invite and remove flows
  - report numbers on fixture data
  - CSV content
- Stories: 32–43, 47, 48, 50, 62–68.

### B6: Platform admin operations

- **Create a Shop** in one step: Owner, Barbers, Services and hours (it replaces the `staff:add` script).
- **Client import:** import from CSV, with phone normalization and duplicate merging.
- **SMS registration:** record the Shop's registration status. Approval flips `sms_enabled`.
- **Shop settings:** record the minutes per manual booking, and the free-month or paid flag.
- **Support access:** a Platform admin gives a reason, and the access is written to `support_access_log` (who, when, why).
- **Failures data:** failed texts, alerts and refunds from `outbox`, with a retry action.
- **Shop cancellation:** export the data, then a scheduled job deletes everything 30 days after the Shop cancels.
- **Tests:**
  - only Platform admins can run these operations
  - import merges duplicates
  - the deletion job removes all tenant rows and nothing from other Shops
  - access is always logged
- Stories: 29, 45, 51, 69–77.

### U1–U5: Interface (after the backend)

- **U1 Booking flow:**
  - online payment choice and Checkout redirect, plus "awaiting payment" and "payment expired" states
  - fix the "Book now" button
  - a phone-width check in Spanish and English
- **U2 Owner area:** settings screens for everything in B5, an all-Barbers calendar view, a paid-online indicator, and a dashboard with weekly Bookings and time saved.
- **U3 Barber area:** profile and gallery editor, weekly hours and days off, a Connect Telegram screen with a QR code, and cancel or move from the day view.
- **U4 Admin panel:** Shops list, create Shop, CSV import, SMS status, failures view and support access.
- **U5 Hardening and launch:**
  - Sentry
  - Playwright journeys 1 (book and pay online) and 2 (Barber alert; Client cancels from the text link and is refunded)
  - Vercel project, environment variables and cron
  - production Turnstile keys
  - a real Resend domain
  - a check of each Shop's go-live list

## Open questions (from the PRD, still to confirm)

| # | Question | Status |
|---|---|---|
| 1 | Rescheduling keeps the original payment | **Decided:** yes, when paid online upfront |
| 2 | "Any available Barber" rule | **Decided:** fewest Bookings that day |
| 3 | Cutoff longer than 2h makes the reminder arrive after the cutoff | Plan: warn the Owner when saving (B5) |
| 4 | Texts while SMS registration is pending | **Decided:** go live, show the link on screen |
| 5 | Stripe fee, negative balance and dispute rules | Not needed now: Stripe is test-only; refunds are in full |
| 6 | Sole-proprietor texting limits (Shops without an EIN) | Open; check with Twilio during B3 |
| 7 | Product name and booking link format | Open (working title "Barber Booking", link `/b/<shop-slug>`) |
| 8 | Which payment provider replaces Stripe | Open; the adapter design keeps this cheap to change |
| 9 | What exactly is wrong with the "Book now" button | Open; describe it at the start of next session |

Questions for the Shop visits: share of walk-ins, minutes per manual booking, Telegram or WhatsApp, $39 or $59 a month.

## Out of scope for version 1

Marketplace, deposits, online tips, WhatsApp, walk-in queue/QR, Google Calendar sync, automated billing, non-barbershops, native apps, loyalty and gift cards, payroll, multiple locations, custom domains, an AI assistant, other time zones, and Client accounts.

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
