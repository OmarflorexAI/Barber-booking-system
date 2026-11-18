# Security audit, 2026-11-18

Scope: the list in `progress.md` (server actions and route handlers, `/auth/*`, `/m/<token>`, cron, webhooks, RLS, public availability, Turnstile, secrets, headers, `dadtest:*` scripts). Live site: https://citrus-system.vercel.app. Database checked live (project `barber-booking-dev`, which is also production).

## Findings (open)

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | **High** | **Bot protection is off in production.** The live JS bundle carries Cloudflare's always-pass test site key (`1x0000…AA`), so the secret on Vercel is almost certainly the always-pass test secret too. The booking form and the landing lead form accept any script. | User: create a Turnstile widget in Cloudflare for `citrus-system.vercel.app`, set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` on Vercel, redeploy (the public key is baked in at build). |
| 2 | **Medium** | **No limit on Bookings per phone, and no rate limits.** With #1, one script can fill every free time in a Shop with fake in-person Bookings (each also queues a Barber alert and, if an email is given, a Client email). `/api/availability*` and the lead form have no rate limit either. | Engine: cap active future Bookings per phone per Shop (needs a number from the user, e.g. 2). Optional: Vercel Firewall rate-limit rule on `POST /b/*` and `/api/availability*`. |
| 3 | **Medium** | **Owners can change Shop fields "only we change" by calling Supabase's API directly** with their own session (RLS `shops_update` allows every column; the `guard_shop_billing_update` trigger skips these): `slug` (Q21 says only our team), `sms_from_number` (texts would go out from any number in our Twilio account, incl. another Shop's), `cancelled_at`, `daily_email_last_date`, `created_at`, `id`. | Migration: add these columns to `guard_shop_billing_update`; extend `tests/engine/plans.test.ts`. |
| 4 | Low | **A Barber can change their own `phone_e164`** (Owner-only per Q27) and skip the app's profile checks (lengths, https photo) through the API; `guard_barber_self_update` doesn't cover it. | Same migration: add `phone_e164` to the guard. |
| 5 | Low | **An Owner can clear a Client's `sms_opt_out` through the API**, i.e. re-enable texts to someone who replied STOP (a TCPA problem once Twilio is on). The app itself never does this. | Same migration: a `clients` guard so `authenticated` can't set `sms_opt_out` from true to false. (Alternative for 3–5: revoke INSERT/UPDATE/DELETE on all public tables from `authenticated`; the app never writes through supabase-js, but `plans.test.ts` asserts an Owner may rename the Shop directly, so that is a design change.) |
| 6 | Low | **Dev, tests and production share one database.** Engine tests create and delete Shops in the live DB; a bad test or script hits real data. | Before real users: a separate production Supabase project (already on the "before real users" list). |
| 7 | Info | Supabase advisor: leaked-password protection is off. Not used (magic links only), so no action. | — |

## Fixed in this session

- **Security headers** (`next.config.ts`): `Content-Security-Policy: frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. Stops clickjacking on `/m/<token>` (cancel button) and `/app`. Verified locally on `/`, `/b/demo-shop`, `/login`; HSTS is already sent by Vercel. A full CSP is left for later (needs nonces for Turnstile, Stripe and the shaders).

## Checked and OK

- **Authz:** every `shopAdmin()` function calls `requireOwner` or `authorizeForBarber`; booking actions derive the Shop from the Booking and authorize the staff actor; `authorizeForBarber` checks the Barber belongs to the Shop. Media upload/delete is Owner-only and path-scoped to `shops/<shopId>/`, no `..`.
- **Sign-in:** `/auth/confirm` verifies the OTP only on POST and limits `next` to `/app…`; `/auth/callback` rejects off-site `next` (live test: `next=//evil.com` → `/login?error=link`). Login always says "sent" and uses `shouldCreateUser: false`.
- **Manage links:** 128-bit HMAC tokens, only the SHA-256 hash stored, secret ≥ 32 chars required at start; `/m` is `noindex`, `no-referrer`, and disallowed in robots.
- **Cron:** `CRON_SECRET` bearer, constant-time compare, fails closed (live: 401 without it).
- **Webhooks:** Stripe signature (HMAC, 5-min tolerance, constant-time, repeat events ignored); Telegram secret header (live: 403 without it); Twilio signature over the configured site URL.
- **RLS:** enabled on every public table; anon has no table grants; outbox, leads, payment_events, sms_log, barber_telegram, scheduled_messages, support_access_log have no policies (server only); Bookings are not writable by signed-in users; plan/billing/payments fields guarded by trigger; storage bucket has no policies (signed uploads via service role only).
- **Public availability:** zod-validated UUIDs, only returns free times.
- **CSV export:** Owner-only, formula injection defused (`csvCell`).
- **Secrets:** no keys in git history (scanned for Stripe, webhook, Resend, JWT and Telegram token shapes); `.env.local` untracked.
- **`dadtest:*` scripts:** local Node scripts, not part of the build; `dadtest:reset` only touches the `dad-test` Shop. They do run against the shared DB (see #6).
