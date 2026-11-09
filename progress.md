# Progress: Barber Master (booking system)

Last updated: 2026-11-09. Source of requirements: `Barbershop Booking System PRD.md`.

## Where we are

**The backend (B1–B6) is done.** B2 (payments) was finished on 2026-11-09; it runs only when the Stripe test keys are in `.env.local`. Next: plug in the real keys and try each provider, then talk about a landing page, then the UI.

Verified on 2026-11-09 (after B2): `npm test` 134 passed (10 files), `npm run e2e` 4 passed, typecheck and lint clean. Without Stripe keys the webhook answers 503 and onboarding 503; the return route lands on `/app/day?payments=pending`.

Phase 1 (the core slice) is **done and verified**. On 2026-11-09 the "Book now" bug was fixed, and **B1 (sending worker)**, **B5 (Owner tools + reporting)** and **B6 (Platform admin backend)** were built and reviewed. Later the same day **B3 (client texts)** and **B4 (alerts + daily email)** were built and reviewed; they run on log-only stand-ins until the Twilio, Telegram and Resend keys are in `.env.local`. Agreed order from here: plug in the real keys → B2 (payments, last) → talk about a landing page → UI.

Verified on 2026-11-09 (after B3/B4): `npm test` 120 passed (8 files), `npm run e2e` 4 passed, typecheck and lint clean. On the dev server the sending worker and the daily job run cleanly; both webhooks refuse unsigned requests.

Verified on 2026-11-09 (after B6): `npm test` 106 passed (5 files), typecheck and lint clean. `/api/cron/daily` returns 401 without the secret and `{"purged":{"shops":0}}` with it.

Verified on 2026-11-09 (after B5): `npm test` 87 passed (4 files, run one file at a time; about 2 min), `npm run e2e` 4 passed, typecheck and lint clean. `/api/cron/dispatch` delivered the 7 waiting demo-shop alerts (to the log senders).

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

- ~~"Book now" did nothing~~ **Fixed 2026-11-09.** Cause: pressing it before the bot check had issued its token got a "complete the security check" error, rendered at the top of the page, off-screen on a scrolled form. Now the button waits for the bot check ("Checking you're not a robot…") and errors show beside it and scroll into view. Regression test: `tests/e2e/book-now.spec.ts` (Pixel 7, 1280x800, 360x560).
- Found and fixed while building B1: outbox payloads were stored as JSON strings instead of objects (migration `20261109181000_outbox_payload_objects.sql` repaired old rows).
- Scheduler for go-live: Vercel cron on the free (Hobby) plan runs at most once a day; the worker needs every minute. Options at deploy time (U5): Vercel Pro, or Supabase `pg_cron` + `pg_net` calling `/api/cron/dispatch`.
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

### B1: Sending worker and scheduled jobs — DONE 2026-11-09

What was built:
- `src/server/dispatch/index.ts`: `createDispatcher({ sql, senders })`, which exposes `run({ now, shopIds? })` and `failures()`.
- `Senders` port: `sms`, `barberAlert`, `refund`.
- `src/server/senders.ts`: log-only senders, until the real providers are connected in B2–B4.
- `GET /api/cron/dispatch`: requires `Authorization: Bearer $CRON_SECRET` (the secret is in `.env.local`) and drains the outbox for up to 50 seconds.
- Migration `20261109180000_outbox_dispatch.sql` adds:
  - `outbox.next_attempt_at`, used both as the claim lease and the retry time
  - a `skipped` status
  - an `sms_reminder` type
- How it behaves:
  - Retries come 1, 5 and 30 minutes after a failure; the 4th failure is final and the row shows in `failures()`.
  - Texts are skipped at send time if texts are off, the Client opted out, or the Booking was cancelled.
  - Due reminders become outbox rows in one SQL statement.
  - Delivery is at least once: a crash after sending but before marking the row done resends after the 5-minute lease.
- Removed the engine's `claimDueReminders`: reminders now go only through the worker.
- Tests: `tests/engine/dispatcher.test.ts` (8).
- Try it locally (Git Bash): `curl -H "Authorization: Bearer <CRON_SECRET from .env.local>" http://localhost:3000/api/cron/dispatch`.

Original plan:

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

### B2: Payments (Stripe test mode, provider-neutral) — DONE 2026-11-09 (waiting on Stripe test keys)

**What was built:**
- Migration `20261110110000_payments.sql`: `shops.payment_account_id` (renamed) and `payments_enabled`; booking status `pending_payment` with `hold_expires_at`, `checkout_ref`, `payment_ref`; `cancelled_by = 'system'`; `payment_events` (server-only); outbox type `refund_failed`.
- `src/server/payments/index.ts`: the provider-neutral module (`startOnboarding`, `finishOnboarding`, `startCheckout`, `handleWebhook`, `releaseExpiredHolds`, `refund`) behind the `PaymentProvider` port. `src/server/providers/stripe.ts` is the only file that knows Stripe (fetch, no SDK; Connect express accounts with direct charges; signature check with 5-minute tolerance).
- Engine: an online Booking is created as `pending_payment` for 10 minutes and nobody is told; the paid webhook confirms it and sends the alert, text and reminder. A payment after the hold ran out is refunded in full. Held Bookings count toward the unpaid limit, block the time, can't be marked arrived, and aren't in the stats.
- Dispatcher: a refund that keeps failing writes a `refund_failed` row; the Owners get an email to refund by hand.
- Routes: `POST /api/payments/webhook`, `GET /api/payments/onboard?shop=<id>` (Owner), `GET /api/payments/return`. `/api/cron/dispatch` releases expired holds first.
- UI: online payers go straight to checkout; the manage page shows "Waiting for payment" with a **Pay now** button and a thank-you after paying.

**To try it (test mode):**
1. Stripe dashboard in test mode: turn on Connect. Copy the test secret key into `STRIPE_SECRET_KEY`.
2. Install the Stripe CLI and run `stripe listen --forward-connect-to localhost:3000/api/payments/webhook`; put the `whsec_...` it prints in `STRIPE_WEBHOOK_SECRET`. Restart `npm run dev`.
3. As an Owner, open `/api/payments/onboard?shop=<shop id>` and finish Stripe's test onboarding (use its test data).
4. Book with "pay online", pay with card `4242 4242 4242 4242`; the manage page should turn to Confirmed after a refresh.

**Original plan:**

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

### B3: Client texts (Twilio) — DONE 2026-11-09 (waiting on real keys)

What was built:
- **`src/server/texting`**: `createTexting({ sql, provider, config, clock })`.
  - `send` writes the text in the Client's language (`bookings.locale`, set by the booking form), with their manage link, sends it and logs it in `sms_log`.
  - Templates (`templates.ts`): confirmation, reminder, cancelled by the shop, time changed; English and Spanish. All carry STOP wording and fit in 2 segments. Spanish dates drop accents ("sab"), because one accent would switch the whole text to the 70-character alphabet.
  - **Daily limit:** 900 segments per Shop per local day (`SMS_DAILY_SEGMENT_CAP`). Over it the text waits until the Shop's next day (`RetryLater` in the dispatcher; the wait doesn't use up retries). A warning is logged at 80%.
  - `handleReply`: STOP-type words opt the number out, START-type words opt it back in, for every Shop texting from that number.
- **Manage links** are now an HMAC of the Booking id with `MANAGE_LINK_SECRET` (in `.env.local`, never change it once live), so the reminder can rebuild the link. Bookings made before 2026-11-09 evening have old random links; their reminders would carry a link that doesn't open (dev data only).
- **Twilio adapter** (`src/server/providers/twilio.ts`, fetch, no SDK) and **`POST /api/twilio/inbound`** (checks Twilio's signature against `NEXT_PUBLIC_SITE_URL`).
- **Tests:** `tests/engine/texting.test.ts` (4) and `tests/unit/twilio-signature.test.ts` (2).
- **Simplified on purpose:**
  - One platform Twilio account with an optional per-Shop sending number (`shops.sms_from_number`), instead of a subaccount per Shop.
  - Twilio's Advanced Opt-Out sends the STOP/START/HELP replies (keep it on for the number).
  - The refund notice text comes with B2 payments.
  - Two workers running at the very same moment could go a text or two over the cap (no lock); a text can repeat if the log insert fails after sending (at-least-once, like all sends).

Original plan:

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

### B4: Barber and Owner alerts (Telegram + Resend) — DONE 2026-11-09 (waiting on real keys)

What was built:
- **`src/server/alerts`**: `createAlerts({ sql, chat, email, config, clock })`.
  - `send`: new, cancelled, moved and paid alerts to the Barber's Telegram, with a link to `/app/day?date=...`. If Telegram isn't linked or fails: email to the Barber's login, or to the Owner when the Barber has no login.
  - `createTelegramLink` (single-use, 24 hours; a Barber for themselves, the Owner for anyone in the Shop), `unlinkTelegram`, `handleTelegramUpdate` ("/start <token>").
  - `sendDailySummaries`: yesterday's online bookings, walk-ins, no-shows and minutes saved to each Shop's Owners, from 7:00 Shop time, once per day. A failing Shop is retried next run and doesn't stop the others.
- **Telegram adapter** + **`POST /api/telegram/webhook`** (checks `TELEGRAM_WEBHOOK_SECRET`, always answers 200). `npm run telegram:webhook -- https://public-address` registers it and prints the bot's username.
- **Resend adapter** (fetch). Without a verified domain, Resend only delivers to the account's own email.
- **`/api/cron/daily`** now sends the daily email and runs the 30-day deletion (independently). Schedule it at 11:00 and 12:00 UTC so 7:00 New York works in summer and winter.
- **Day view:** a small "Get booking alerts on Telegram" button (link only; the QR code comes with the UI phase). `telegramUnlinkAction` exists for the UI.
- **Wiring** (`src/server/senders.ts`): each provider is used only when its keys are set; otherwise it prints to the server log.
- **Migration** `20261110090000_messaging.sql`: `bookings.locale`, `shops.sms_from_number`, `shops.daily_email_last_date`, `sms_log`, `barber_telegram` (server-only tables).
- **Tests:** `tests/engine/alerts.test.ts` (6), plus dispatcher tests for "hold until" and "Booking deleted".
- **Still to do (needs you):** move Supabase login emails to Resend SMTP (Supabase dashboard > Authentication > Emails > SMTP: host `smtp.resend.com`, port 465, user `resend`, password = the Resend API key). Alerts are English only for now.

Original plan:

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

### B5: Owner operations and reporting — DONE 2026-11-09

New rule from the user (2026-11-09): **a Shop has at most 6 active Barbers** for Clients to choose from.
- Enforced by the trigger `guard_barber_limit` (SQLSTATE BB002, per-Shop lock so two adds at once can't both get through), in migration `20261109190000_barber_limit.sql`.
- `MAX_ACTIVE_BARBERS` in `src/server/shop-admin`.
- The demo shop now has 6 Barbers: Carlos, Dre, Maya, Luis, Jay, Nia. `supabase/seed.sql` is updated, and the 3 new ones were inserted into the dev DB.

What was built:
- **`src/server/shop-admin`**: `createShopAdmin(sql)`. Every operation checks the caller's role.
  - **Barbers:** `addBarber`, `removeBarber` (refused while they have upcoming Bookings; the Barber is deactivated, their login loses access and history is kept), `linkBarberLogin` (connecting a new login removes the old one's access).
  - **Services and prices:** `saveService`, `archiveService`, `setBarberPrice`, `removeBarberPrice`, `setSpecialPrice` (owner only).
  - **Hours and days off:** `setWeeklyHours` (a Barber sets their own; the Owner sets anyone's), `removeBarberDayOff`, `removeShopClosedDay`.
  - **Cutoff:** `setCancelCutoff` returns a `REMINDER_AFTER_CUTOFF` warning when the cutoff is over 2h.
  - **Blocklist:** `blockPhone`, `unblockPhone`, `listBlocked`.
  - **Profile:** `updateBarberProfile` and `setGallery` (up to 6 photos, https links only).
- **`src/server/reporting`**: `createReporting(sql)`, owner only.
  - `weeklyStats`: Bookings, walk-ins, no-shows and time saved per Monday–Sunday New York week.
  - `dayStats`: the same for one day, for the daily email.
  - `exportClientsCsv`: cells are made safe against spreadsheet formula injection.
- **`src/server/invites.ts`**: `inviteBarber` creates the login (service role) if it's new and connects it. The Barber signs in at `/login`. The "you've been added" email comes in B4.
- **Shared access checks** moved to `src/server/booking-engine/access.ts` (`staffRole`, `authorizeForBarber`, `requireOwner`).
- Tests: `tests/engine/shop-admin.test.ts` (27). `vitest.config.mts` now runs DB test files one at a time: they share the 15-client pooler, and the heavy-race test failed about 1 in 4 runs when they ran in parallel.

Reviewed with `/code-review` (two axes: standards and spec). Fixed:
- a leftover login keeping access after a Barber's login was replaced
- named SQLSTATE constants and error factories
- date checks on the remove-day operations
- the name check on `addBarber`
- reporting split into its own module (it is a separate module in the PRD)

Open after review (decide or do later):
- **Photo uploads (Supabase Storage)** are not built: the profile takes https links for now. To do with the profile screen (U3).
- **Gallery minimum:** the PRD says 3–6 photos. The backend allows 0–6 so a Barber can build it up; the screen will ask for at least 3.
- **"All Barbers' calendar" and "paid online" views** (stories 39, 40, 67):
  - The day view `/app/day` already reads Bookings with RLS (a Barber sees their own; the Owner switches Barbers).
  - An all-Barbers-at-once view is a UI task (U2).
- **No-shows in the numbers:** a no-show still counts as an online Booking and as time saved (the phone call was still avoided), and is also reported separately. Confirm this reading.
- **`setSpecialPrice`** accepts an end date in the past (it just has no effect). Minor; the screen will use a date picker.
- **`inviteBarber`** can connect any existing account by email without that person agreeing. Fine for the pilot, where invites happen in person; revisit before self-serve signup.
- **`inviteBarber`** itself has no automated test (it calls Supabase Auth); `linkBarberLogin` is tested.

Original plan:


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

**DONE 2026-11-09.** What was built:
- **`src/server/platform-admin`**: `createPlatformAdmin(sql)`. Every operation requires a Platform admin, except the scheduled `purgeCancelledShops`.
  - `createShop`: one transaction (Shop, Owner membership, up to 6 Barbers with the Owner first when they cut hair, Services with the same starting price for every Barber, the same starting hours for every Barber). `checkNewShop` validates a form without touching the database.
  - `listShops`: status, texting registration, billing, minutes per booking, active Barbers, online Bookings in the last 7 days.
  - `importClients`: CSV from Excel/Sheets/Numbers. Finds the name and phone columns by header, normalizes phones, merges repeats, never changes existing Clients (a blocked number stays blocked), reports bad rows by line. Logged as support access.
  - `setSmsRegistration` (approved turns texting on; any other status turns it off), `setBillingStatus` (free_month / paid / overdue), `setManualBookingMinutes`.
  - `openSupportAccess` / `listSupportAccess`: reason required; who, when, why.
  - `listFailures` (across Shops, with the Shop name) and `retryFailure` (back to the queue with fresh retries).
  - `cancelShop` (booking page closes at once; cancelling again keeps the first date), `reactivateShop` (cancelled Shops only), `exportClients` (client CSV for a leaving Owner, logged), `purgeCancelledShops` (deletes Shops cancelled 30+ days ago with all their rows and the staff logins that belonged only to them; Platform admins are never deleted).
- **App layer:** `onboardShop` in `src/server/invites.ts` checks the form, creates the Owner's login by email (`src/server/logins.ts`, shared with `inviteBarber`), then creates the Shop. `platformAdmin()` singleton in `src/server/engine.ts`.
- **`/api/cron/daily`**: runs the 30-day deletion (the Owner's daily email joins it in B4). Shares `src/server/cron-auth.ts` with `/api/cron/dispatch`.
- **Migration** `20261109200000_platform_admin.sql`: `shops.sms_registration`, `shops.billing_status`, `shops.cancelled_at` (must be set exactly when status is cancelled).
- **Shared:** `src/lib/csv.ts` (CSV reader + safe cell writer, also used by the Owner export).
- **Tests:** `tests/engine/platform-admin.test.ts`, 19 tests.
- **Review (two-axis) fixes applied:** whitespace Owner name no longer links the Owner to another Barber; only the slug constraint reads as "link name taken"; unknown Shop gives NOT_FOUND; buffers and list limits validated; cancel/reactivate respect the current status; the Owner login is created only after the form passes.
- **Left as is (on purpose):**
  - `npm run staff:add` stays as a dev tool until the admin screens (U4) exist.
  - Deleting a Shop also deletes its support access log ("deletes everything").
  - `overdue` is an extra billing state beyond free/paid. It's harmless, so it was kept.
  - The daily job still needs a scheduler at deploy (same note as the dispatcher).

Original plan:
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
| 9 | "Book now" button | **Fixed 2026-11-09** (the button now waits for the bot check, and errors scroll into view) |
| 10 | No-shows | **Recommended (2026-11-09, waiting on the user):** keep it simple, no new rules. Barbers mark no-shows in the day view; the Owner's stats show them separately. Easiest next step: a no-show count per client in the client export so the Owner can block repeat offenders. A no-show fee waits for payments (B2). |

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

1. Paste the keys into `.env.local` only (never into chat): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (`.env.example` lists them). Restart `npm run dev`, then test each provider for real; the Twilio and Telegram webhooks need a public address (deploy, or a tunnel).
2. Move the login emails to Resend SMTP (see B4).
3. Talk about whether to build a landing page, then the dashboards and UI (U1–U5).

## Git

- Local repo on branch `main`, all work committed.
- Remote already added: `origin` → `https://github.com/OmarflorexAI/Barber-booking-system.git`.
- Pushed: https://github.com/OmarflorexAI/Barber-booking-system (`main` tracks `origin/main`).
