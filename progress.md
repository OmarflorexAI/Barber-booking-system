# Progress: Barber Master (booking system)

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
| 6 | Sole-proprietor texting limits (Shops without an EIN) | **Researched** (see below): sole proprietor is enough for a pilot Shop; add a daily cap guard in B1 |
| 7 | Product name and booking link format | **Decided:** the product is **Barber Master** (app title renamed 2026-11-07). Link stays `/b/<shop-slug>` |
| 8 | Which payment provider replaces Stripe | **Researched** (see below): leaning Square or Stripe for cards, PayPal/Venmo as an optional extra; Zelle can't be automated. Final pick in the B2 grilling |
| 9 | "Book now" button | **Bug:** clicking it does nothing (no message, no booking). Fix first thing next session with `/diagnosing-bugs` |

Questions for the Shop visits: share of walk-ins, minutes per manual booking, Telegram or WhatsApp, $39 or $59 a month, and which card reader/payment app the Shop already uses.

## Research notes (2026-11-07)

### Texting limits for Shops without an EIN (sole proprietor, Twilio A2P 10DLC)

- **Limit:** about **1,000 message segments per day to T-Mobile users**, roughly 3,000 per day across all US carriers. It does not grow with a trust score.
- **Speed:** 0.5 messages per second per number (Twilio changelog, March 2026).
- **Campaigns:** reportedly 1 campaign and 1 phone number per brand. Confirm this in the Twilio Console.
- **Shops with an EIN** use Standard registration: 2,000 to 200,000 per day to T-Mobile, depending on trust score.
- **What a pilot Shop needs:** 40 Bookings a day × (confirmation + reminder + the odd cancel) is about 100–150 texts. A long text splits into 2–3 segments, especially in Spanish: letters like á, í, ó, ú force a smaller segment size, while ñ and é don't. That is still about 300–450 segments a day, well under 1,000.
- **Decision for B1/B3:**
  - Count segments per Shop per day.
  - Warn the Platform admin at 80% of the cap, and hold extra texts rather than letting the carrier drop them.
  - Keep templates short.
- Sources: [Twilio A2P 10DLC brand docs](https://www.twilio.com/docs/trust-hub/registrations/a2p-10dlc-brand), [T-Mobile daily limits](https://support.twilio.com/hc/en-us/articles/1260804800549-T-Mobile-Daily-Message-Limits-for-Long-Code-Messaging-with-A2P-10DLC), [Twilio changelog, March 2026](https://www.twilio.com/en-us/changelog/increased-mms-rate-limits-for-a2p-10dlc-phone-numbers-in-the-u-s0), [Starter vs Standard registration](https://support.twilio.com/hc/en-us/articles/4407882914971-Comparision-between-Starter-and-Standard-registration-for-A2P-10DLC).

### Payment provider (Zelle, PayPal, Venmo, Stripe, Square)

Cost of a $30 haircut paid online (published rates; confirm on each official pricing page before deciding):

| Option | Fee | On $30 | Can we automate it? |
|---|---|---|---|
| Stripe (cards) | 2.9% + $0.30 | ≈ $1.17 | Yes: checkout, webhooks, refunds |
| Square (online cards) | not confirmed in this research (in person: 2.6% + $0.10) | about the same as Stripe | Yes: checkout API, webhooks, refunds |
| PayPal checkout (also how Venmo is offered) | ≈ 3.49% + $0.49 | ≈ $1.54 | Yes, but costs more; chargebacks and disputes cost about $15–30 each |
| Zelle | free | $0 | **No.** There is no merchant checkout API: we can't confirm a payment, hold a Slot or refund automatically. Only usable as a manual "pay the Shop by Zelle" note |

Findings:
- **Stripe is not the expensive one.** For online card payments it is among the cheapest. PayPal and Venmo cost more per payment.
- **Zelle is free but can't power online booking.** It has no way to tell our system a payment arrived and no automatic refunds. Those two pieces are what the 10-minute hold and the full-refund rule depend on.
- **Square is the strongest alternative to Stripe** for barbershops. Many already use Square card readers in the shop, so online and in-person money would land in one place.

Recommendation:
- Card payments: Square, if the pilot Shops already use it, otherwise Stripe.
- PayPal/Venmo: an optional extra button later.
- Zelle: shown only as an "in person / Zelle" note, with no automation.

The Payments module is provider-neutral, so this choice stays cheap to change. Decide in the B2 grilling after asking the Shops.

Sources: [NerdWallet: PayPal fees](https://www.nerdwallet.com/article/small-business/paypal-fees), [NerdWallet: payment processors](https://nerdwallet.com/business/software/learn/payment-processors), [Stripe vs Square vs PayPal (Beancount, 2026)](https://beancount.io/blog/2026/10/18/stripe-vs-square-vs-paypal-small-business-fees-payouts-hardware-guide), [Zelle for business banks (FIS)](https://www.fisglobal.com/en/products/fis-zelle), [Zelle on Shopify (community)](https://community.shopify.com/t/can-i-accept-zelle-payments-on-my-online-store/186638), [Zelle/Paze distribution (American Banker)](https://www.americanbanker.com/payments/news/early-warning-services-lands-new-distribution-for-zelle-paze).

## Out of scope for version 1

Marketplace, deposits, online tips, WhatsApp, walk-in queue/QR, Google Calendar sync, automated billing, non-barbershops, native apps, loyalty and gift cards, payroll, multiple locations, custom domains, an AI assistant, other time zones, and Client accounts.

## Tomorrow: start here

1. If not done yet: create the GitHub repo and push (see Git below).
2. Fix the "Book now" bug: clicking it does nothing. Use `/diagnosing-bugs`. First suspects: the form's `submit()` returns early when a step value is missing, or the bot check token is never issued, so the button submits nothing.
3. Run `/setup-matt-pocock-skills`.
4. Run `/grill-with-docs` for B1 (sending worker).

## Git

- Local repo on branch `main`, all work committed.
- Remote already added: `origin` → `https://github.com/OmarflorexAI/Barber-booking-system.git`.
- As of 2026-11-07 the repo **does not exist on GitHub yet**. It could not be created from this machine: the GitHub CLI isn't installed and the GitHub connector's token expired.

To finish (PowerShell):

1. Go to https://github.com/new while logged in as OmarflorexAI.
2. Name the repo `Barber-booking-system`. Keep it Private, and don't add a README, .gitignore or license.
3. Run:

   ```powershell
   git push -u origin main
   ```

   Git Credential Manager will open a browser window to log in the first time.
