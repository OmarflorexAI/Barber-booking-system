# Security audit, second pass, 2026-11-20

Follows `docs/security-audit-2026-11-18.md` (findings #1–#7). Scope: re-check the open items, then the surface shipped since (self sign-up, `/setup`, Google sign-in, `/auth/callback`, media actions, the Shop tab's reuse of the Barber actions), then every server action and route handler for input validation, IDOR, leaky errors and calls without the UI. Live site: https://citrus-system.vercel.app (deploy of `2fe67f5`). Database: `barber-booking-dev` (also production), read only.

## Findings

| # | Severity | Status | Finding | Fix |
|---|---|---|---|---|
| 1 | **High** | Open, confirmed | **Bot protection is still off in production.** The live `/b/demo-shop` bundle carries Cloudflare's always-pass test site key `1x00000000000000000000AA`. Since the first pass, the same check also guards sign-up (`/login?mode=signup` magic links) and `/setup`, so scripts can now also create logins and Shops (see #14). | User: in Cloudflare, create a Turnstile widget for `citrus-system.vercel.app`; on Vercel set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` (Production) to the new pair; redeploy (the site key is baked in at build). Both names already exist on Vercel, so replace their values only. |
| 8 | **High** | Open, needs the user | **A live Stripe secret key (`sk_live_…`) sits in a comment in the local `.env.local`.** It was never used and the file is gitignored, but it was printed in this session's tool output while checking which env names the Vercel CLI had touched, so treat it as exposed. | User: in the Stripe dashboard (live mode) → Developers → API keys, roll that secret key; then delete the commented line from `.env.local`. |
| 2 | Medium | Open, corrected | **The per-phone cap already exists:** `createBooking` refuses a third upcoming unpaid Booking for the same phone at a Shop (`UNPAID_LIMIT`, tested in `booking-engine.test.ts`, messages in EN/ES); the first pass missed it. What's left is that phones aren't verified, so a script can use many made-up numbers; and there are no rate limits on `POST /b/*`, `/api/availability*`, the lead form or magic-link sends (Supabase's own email limit only). | Fixing #1 is the main defence. Then a Vercel Firewall rate-limit rule per IP on `/b/*` and `/api/availability*` (dashboard → Firewall; the user's call, it's a standing rule on the project). |
| 3 | Medium | **Fixed** | Owners can change "only we change" Shop columns (`slug`, `sms_from_number`, `cancelled_at`, …) through Supabase's API: the `shops_billing_guard` trigger still doesn't cover them (checked live). | Migration `20261120120000_guard_gaps.sql` extends `guard_shop_billing_update`; tests in `tests/engine/plans.test.ts`. |
| 4 | Low | **Fixed** (engine and DB) | A Barber can change their own Owner-only `phone_e164` through Supabase's API (`barbers_self_update_guard` doesn't cover it, checked live). **New this pass:** the engine's `updateBarberProfile` also accepted `phone` from a Barber editing their own profile; only `email` was Owner-only. The app's only caller always sends `email`, so it was refused in practice, but the engine didn't enforce it. | Engine fixed: `phone` is now Owner-only like `email` (test: "a Barber edits their own profile but not the Owner-only phone"). DB path: the same migration adds `phone_e164` to the guard. |
| 5 | Low | **Fixed** | An Owner can clear a Client's `sms_opt_out` through Supabase's API (no guard on `clients`). | Same migration: new `clients_opt_out_guard`. |
| 6 | Low | Open | Dev, tests and production share one database. | Separate production Supabase project before real users. |
| 10 | Low | Open | `callbackUrl()` in `src/app/login/actions.ts` builds the sign-in return URL from the request's `Host` / `X-Forwarded-Host`. Vercel sets those itself and Supabase only honours URLs on its redirect allow list, so this is safe **as long as the allow list has no wildcards**. | User: in Supabase → Authentication → URL Configuration, confirm the allow list holds exactly `http://localhost:3000/auth/callback` and `https://citrus-system.vercel.app/auth/callback` (no `*`). Optional code change: use `NEXT_PUBLIC_SITE_URL` when it's set. |
| 11 | Low | Open | `GET /api/payments/onboard?shop=<id>` starts Stripe onboarding on a GET, so a link on another site can start it for a signed-in Owner (cross-site request). Impact is small (it only creates or reopens the Shop's own onboarding link), and production has no Stripe keys yet, so it answers 503 today. | Before payments go live: make it a POST form with the session's same-site check (a server action). |
| 12 | Info | Open | Barber photo and gallery URLs accept any `https` host. An Owner can put a third-party image on the Client booking page, which then sees Clients' IP addresses. The upload flow only produces our own Storage URLs. | Optional: accept only the `shop-media` bucket's public URL prefix. |
| 13 | Info | Plan | No full Content-Security-Policy yet (only `frame-ancestors 'none'`). | Plan below. |
| 14 | Info | OK by design | One login gets at most one Shop (per-login advisory lock + membership check inside the transaction; a Barber login is refused). One person with many verified emails can make many Shops, each emailing the team one lead. Bounded by email verification and #1. | Fixing #1 is enough for now. |
| 7 | Info | No action | Supabase advisor: leaked-password protection off. Magic links and Google only, no passwords. | — |

## Fixed in this pass

- **#3, #4 (DB path), #5: fixed, applied 2026-11-20** (`npx supabase db push --remote`; the full test suite passes, 220 tests). `supabase/migrations/20261120120000_guard_gaps.sql` adds `id`, `slug`, `sms_from_number`, `cancelled_at`, `daily_email_last_date`, `created_at` to `guard_shop_billing_update`; `phone_e164` to `guard_barber_self_update`; and a new `clients_opt_out_guard` so a signed-in user can't set `sms_opt_out` from true to false. Three tests in `tests/engine/plans.test.ts` cover it (they failed before the push). Left open: an Owner can delete an opted-out Client and insert them again; Twilio's own STOP list still blocks those texts at the carrier.
- **#4, engine path:** `src/server/shop-admin/index.ts` `updateBarberProfile` refuses `phone` (as well as `email`) unless the caller is the Owner. Test added in `tests/engine/shop-admin.test.ts`; the whole file passes (49 tests).

## Checked and OK

- **Sign-up (`src/server/signup/`, `/setup`):** the login comes from the session, never the form; inputs are length- and format-checked; Turnstile is checked before any write; the slug regex is built only from `[a-z0-9-]`, so no regex injection; a taken link retries inside a savepoint. The team email after sign-up runs in `after()` and can't block or leak.
- **Sign-in:** `/auth/callback` exchanges the OAuth code or verifies the OTP and only follows same-origin `next` paths. Log in uses `shouldCreateUser: false` and always answers "sent"; only sign-up (behind Turnstile) can create a login. `/auth/signout` is POST only.
- **`Staff.name` from `user_metadata`:** rendered as React text in the shell only (`shell.tsx`); never in an email or raw HTML.
- **Lead emails:** plain text; whitespace is collapsed before saving, so a name can't add email headers.
- **Server actions and route handlers:** every one validates its input with zod (UUIDs, lengths, enums, ISO dates, manage-link token shape), takes the user from the Supabase session and lets the engine authorize (`requireOwner` / `authorizeForBarber`). Errors go back as codes, never messages or rows. No action trusts a Shop or Barber id without that check.
- **Media and the Shop tab:** uploads are Owner-only, path `shops/<shopId>/<kind>/<uuid>.(webp|jpg)`; deletes check the same shape, refuse `..`, `\`, leading `/` and other Shops; the bucket accepts only WebP/JPEG up to 3 MB. Deleting a Barber is scoped by `shop_id`, takes the Barber's advisory lock and refuses while they have upcoming Bookings; an Owner can't delete their own profile. The 7-Barber limit is the `BB002` trigger.
- **Dependencies:** `npm audit --omit=dev`: 0 vulnerabilities.
- **Supabase advisors:** unchanged from the first pass (7 server-only tables with RLS and no policies, by design; #7).
- **Production env on Vercel (names only):** no `STRIPE_*` keys, so payments are off in production; `CRON_SECRET`, `MANAGE_LINK_SECRET`, `TELEGRAM_WEBHOOK_SECRET` are set.

## CSP plan (#13)

Next 16 supports a per-request nonce set in `src/proxy.ts` (see `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`). Steps:

1. Start in **report-only** mode: `Content-Security-Policy-Report-Only` with `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com https://checkout.stripe.com; img-src 'self' data: blob: https://<project>.supabase.co; connect-src 'self' https://<project>.supabase.co; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`.
2. The two inline scripts in `src/app/layout.tsx` (theme, shader style) and the one in `_landing/html-lang.tsx` take the nonce, or are replaced by hashes so the landing can stay static.
3. Nonces make pages dynamic; the landing and legal pages are static on purpose, so give them a hash-based policy instead and keep nonces for `/app`, `/b`, `/m`.
4. Watch reports for a week, then switch to enforcing.

## Needs the user

1. Roll the live Stripe key (#8) and delete its line from `.env.local`.
2. Production Turnstile keys (#1).
3. Optional: a Vercel Firewall rate-limit rule on `/b/*` and `/api/availability*` (#2; the per-phone cap already exists).
4. Check the Supabase redirect allow list has no wildcards (#10).
