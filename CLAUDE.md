# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Barber Master: a booking system for barbershops (Bronx / upper Manhattan). Clients book on their phones at `/b/<shopSlug>` and manage the booking through a signed link at `/m/<token>`. Staff sign in by magic link and work from `/app/day`. Shop Owners land on the marketing page at `/` (English) or `/es` (Spanish). Requirements are in `Barbershop Booking System PRD.md`. **`progress.md` is the running log**: current state, decisions, open items, what needs the user, and "Next steps (start here next session)". Read it at the start of a session and update it when work lands. The `README.md` is just the create-next-app stub.

## Commands

The shell is PowerShell on Windows. Run everything from the repo root.

| Task | Command |
|---|---|
| Dev server | `npm run dev` (http://localhost:3000) |
| Build | `npm run build` (Next 16 dev writes to `.next/dev`, so build and dev can run side by side) |
| Typecheck | `npm run typecheck` (`next typegen` + `tsc --noEmit`) |
| Lint | `npm run lint` |
| Unit + engine tests | `npm test` · `npm run test:unit` · `npm run test:engine` |
| One test file / one test | `npx vitest run tests/engine/payments.test.ts` · `npx vitest run -t "name substring"` |
| E2E (Playwright, Pixel 7 profile; starts or reuses the dev server) | `npm run e2e` · `npx playwright test tests/e2e/landing.spec.ts` |
| Create a staff login | `npm run staff:add -- you@example.com demo-shop owner Carlos` |
| Stripe CLI (project-local, in `tools/stripe/`, gitignored) | `npm run stripe -- <args>`; `npm run stripe:listen` forwards webhook events to `/api/payments/webhook` |
| Landing screenshots | `npm run landing:shots` |

Testing notes:
- **Engine tests hit the real hosted Supabase database** (`DATABASE_URL` from `.env.local`, loaded by `tests/setup-env.ts`). There is one Supabase project (`barber-booking-dev`) shared by the app and the tests. Each test builds a throwaway Shop with a random slug (`tests/engine/fixtures.ts`) and deletes it afterwards. Tests use an injected clock (`NOW` = 2027-01-11 09:00 New York), never the real time.
- Vitest runs files one at a time (`fileParallelism: false`) because the pooler allows only ~15 clients. Keep it that way.
- If the dev server reloads in a loop ("HMR hash mismatch"): stop it, delete `.next`, start it again.

## Architecture

**Next.js 16.4 App Router** with `cacheComponents` and `partialPrefetching` on. `src/proxy.ts` replaces middleware: it refreshes the Supabase session only for `/app`, `/login` and `/auth` (the public `/b` and `/m` pages skip it on purpose), and handles the landing's language redirect on `/`. Tailwind v4 runs through the Turbopack loader. See AGENTS.md: check `node_modules/next/dist/docs/` before using Next APIs.

**Two ways into the database:**
- `src/server/db.ts`: a postgres.js pool on `DATABASE_URL` (session pooler, `prepare: false`). It connects as the DB owner, so **RLS does not apply**. The server modules do their own authorization (`src/server/booking-engine/access.ts`: `authorizeForBarber`, `requireOwner`, `requirePlatformAdmin`).
- `src/lib/supabase/{server,client}.ts`: supabase-js with the user's session, for auth and RLS-scoped reads. Server actions get the user id from Supabase auth and then call the engine with a staff `Actor`.

**Server modules (`src/server/`) are factories** (`createX(sql, deps)`) so tests can pass in their own `sql` and fakes. App-wide singletons are wired in two places:
- `src/server/engine.ts`: `bookingEngine()`, `shopAdmin()`, `reporting()`, `platformAdmin()`.
- `src/server/senders.ts`: the dispatcher, payments, texting, alerts and leads, wired to real providers (Twilio, Telegram, Resend, Stripe in `src/server/providers/`) **only when their env keys are set**. Without the keys, log-only stand-ins print what would have been sent. Missing keys are a normal dev state, not an error.

**Booking engine (`src/server/booking-engine/`)** is the one place that knows the booking rules. Pages, server actions, cron routes and webhooks all call it. Key invariants:
- No double booking is enforced **in Postgres** by an exclusion constraint, plus a per-Barber advisory lock. Engine errors are `BookingError`s carrying codes; the UI maps those codes to messages.
- Times are stored in UTC and shown in `America/New_York`, DST-safe (`time.ts`, `@date-fns/tz`).
- "Any available Barber" means the free Barber with the fewest Bookings that day (ties go to sort order, then id).

**Outbox pattern:** every side effect (Client text, Barber alert, refund request, refund failure) is written as a row in `outbox` **in the same transaction** as the booking change. `src/server/dispatch/` drains it with retries, a failure log and `RetryLater` (for example, when a Shop's daily SMS cap is used up). It runs from `/api/cron/dispatch` (every minute in production) and `/api/cron/daily`. Both routes require `Authorization: Bearer $CRON_SECRET` (`src/server/cron-auth.ts`). Never call a provider directly from a booking operation; add an outbox row instead.

**Payments are provider-neutral.** Stripe (test mode, Connect Standard accounts, direct charges) is a placeholder that will be replaced. Only `src/server/providers/stripe.ts` may know Stripe; everything else goes through the `PaymentProvider` type in `src/server/payments/`. Fixed rules: an online Booking holds its time for 10 minutes as `pending_payment`; a payment that arrives late is refunded automatically; refunds are always in full; a moved Booking keeps its payment. The webhook ignores repeated events.

**Database:** schema, RLS policies and triggers live in `supabase/migrations/` (timestamped SQL). Every table has row-level security. Some guards are DB triggers that raise custom SQLSTATEs (for example, the Barber limit raises `BB002`). `supabase/seed.sql` creates the demo shop `demo-shop` ("Fresh Cuts Barbershop").

**i18n:** a small in-house dictionary, not next-intl. App strings are in `src/lib/i18n/dictionaries.ts`; all landing copy (EN/ES) is in `src/lib/i18n/landing.ts`. In the app, the locale comes from the `lang` cookie, else `Accept-Language` (`getDictionary()` in `server.ts`). The landing and legal pages instead take it from the URL (`/` vs `/es`, `/privacy` vs `/es/privacy`) so they stay static; legal copy is in `src/lib/i18n/legal.ts`. Every user-facing string needs both English and Spanish.

**Landing page:** `src/app/page.tsx` (EN) and `src/app/es/page.tsx` (ES) both render `Landing` from `src/app/_landing/landing.tsx`, one file per section in `src/app/_landing/`. Both are fully static (no cookies/headers in their render). `src/proxy.ts` redirects `/` to `/es` for Spanish visitors (cookie, else Accept-Language) and turns `?lang=en|es` into the cookie. The design system is in `DESIGN.md`: a near-black grayscale theme scoped to `.landing` (`--l-*` tokens in `globals.css`), one barber red only for live/status signals, Geist + Geist Mono. Scroll-driven motion is CSS (`animation-timeline`) behind `@supports` and reduced-motion checks; React `<ViewTransition>` is used in three places only (the hero phone's screens, the language switch, page moves). Legal pages: `src/app/_legal/` + `/privacy`, `/terms` and their `/es` versions; `src/app/not-found.tsx` is bilingual. SEO: `metadataBase` from `src/lib/site.ts` (`NEXT_PUBLIC_SITE_URL`, baked in at build time), `sitemap.ts`, `robots.ts`. Leads from the form are saved to `public.leads` and emailed to Platform admins (`src/server/leads/`). Rules: no fake testimonials or numbers, and no price except "first month free". Design work uses the project-local `/impeccable` skill (`.claude/skills/impeccable`).

**Bot protection:** Cloudflare Turnstile on public forms (always-pass test keys in dev, `src/server/turnstile.ts`).

## Domain vocabulary

Use the PRD's capitalized terms consistently: Shop, Owner, Barber, Client, Booking, Walk-in, Service, Platform admin. Roles: a Barber sees their own day, an Owner manages the Shop, a Platform admin is our team (support and creating Shops).

## Conventions specific to this repo

- `.env.local` holds the real keys (template: `.env.example`). Use Stripe `sk_test_` keys only.
- `server-only` is imported by modules that must never reach the client bundle (`db.ts`, `engine.ts`, `senders.ts`, …).
- E2E tests run on a phone profile on purpose: Clients book on their phones.
