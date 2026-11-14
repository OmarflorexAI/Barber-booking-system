# PLAN: Shop profile, Barber profiles, team management, plans

Decided with the user in a grilling session on 2026-11-14 (Q1–Q36, answers below). This plan is the
next block of work after P2.5. `progress.md` stays the running log; this file is the plan and its
pass tests. **No code is written for a milestone until the one before it is committed.**

## How we work (the mission system)

- **Orchestrator** (main session): splits each milestone into small `bm-worker` jobs, merges,
  runs typecheck/lint/tests, fixes small QA defects, commits in small conventional commits,
  updates `progress.md`, pushes only after the user's OK.
- **Workers** (`bm-worker`, `.claude/agents/`): one job each (one screen or one engine concern),
  told which files they own and which they must not touch. Jobs that don't share files run in
  parallel. Never `npm run build`, never commit. Short reports.
- **QA inspector** (`bm-qa`): did not write the code, never edits it. Checks the milestone's
  "QA criteria" one by one, PASS/FAIL with evidence (screenshots in `.impeccable/review/<m>/`).
- Every milestone: EN + ES strings, phone first (360/390 px, targets ≥ 44 px, no sideways scroll),
  light + dark, reduced motion respected, transform/opacity-only animation, axe 0, design per
  `DESIGN.md` → "App (Operate mode)". Before a milestone starts: dev server on :3000.

## Decisions (grill answers, 2026-11-14)

| # | Decision |
|---|---|
| Q1 | **We (Platform admin) still create Shops.** The Owner edits the Shop's profile. Self-serve sign-up comes later, after testing with real users. |
| Q2 | Shop profile: name, phone, address, about (EN/ES), **logo**, **cover photo**. Owner edits all of it. |
| Q3 | The booking page `/b/<shop>` header shows logo, cover, address, about, tap-to-call, map link. **Every Shop is fully separate** (data, photos, staff). |
| Q4 | One Dashboard. The Shop profile gets a small "This week" card linking to it. |
| Q5 | Owners land on **Today** after sign-in. |
| Q6, Q18 | **Adding a Barber = the Owner creates a profile under the Shop** (like Google Workspace adding a person). **No email, no login** for Barbers; only the Owner's account matters. |
| Q7 | Max **6** active Barbers. |
| Q8 | Deleting a Barber with upcoming Bookings is **refused**; their upcoming Bookings are listed right there with Move / Cancel. |
| Q9, Q16 | Delete is a **real delete**: profile, photos, prices, hours **and their past Bookings** (past Dashboard weeks drop; online payments stay in Stripe but leave the app). No "former Barbers" list. |
| Q17 | Any login tied to a deleted Barber (and not staff elsewhere, not a Platform admin) is deleted too. |
| Q10 | Barber profile: photo, name, bio (EN/ES), specialties, Instagram (optional), gallery (3–6), Services + prices, weekly hours, days off. **Optional phone, Owner-only** (Q27). Clients see all but the phone. |
| Q11, Q26 | **Barbers never sign in.** The Owner edits every field. The Barber invite, the Barber's own Day view and their "Me" tab are retired. A Barber sign-in may return later as a paid feature. |
| Q12 | Photos go to Supabase Storage, resized on the phone first. Square crop (round display) for Barber photos and logo, ≤ 512 px; gallery and cover keep their shape, ≤ 1600 px; ≤ 10 MB in. |
| Q13, Q14 | No per-Barber stats on profiles. Nothing else from Reloyalize (no loyalty, POS, store). |
| Q19 | **One Shop per sign-in.** Photos live under `shops/<shopId>/…`; only that Shop's Owner (through the server) can change them. |
| Q20 | An Owner who cuts hair is in the Barbers list, edits their own profile, **can't delete themselves**. No second Owner / ownership transfer in this plan. |
| Q21 | The booking link **can't** be changed by the Owner (printed QR codes). Only we can. |
| Q22, Q33 | Screens: Settings → **Shop profile**; Settings → **Barbers** (list, Add sheet, a profile page each). The **Me tab is removed**; Owner tabs are **Today · Dashboard · Settings**; Sign out stays at the bottom of Settings. |
| Q23 | **Services & prices** (Settings) is in this plan, before Barber profiles. |
| Q24, Q28–Q31 | Plans **Free** and **Pro**. Pro = online card payments, Telegram alerts, Client text messages. Free = everything else. Switched **by hand** by us for now (billing by hand); locked features show a "Pro" tag + "Ask us to upgrade". Existing Shops (demo-shop, any with Stripe) start on **Pro**; new Shops on **Free**. |
| Q25, Q27 | No emails or texts to Barbers. New-booking alerts go to the **Owner's** email. |
| Q32 | Landing copy ("first month free") **unchanged** in this plan. |
| Q34 | Adding a Barber needs only a **name**; the rest is optional (initials until a photo). Bookable once they have ≥ 1 priced Service and some hours. |
| Q35 | About/bio: one language required, the other optional; Clients see the written one when theirs is missing (no auto-translation). |

## Milestones

Each one: goal → jobs → **done when** (what you run) → QA criteria → commits.

### M1 · Photo uploads (the base for every picture)

**Goal:** an Owner can upload a picture from their phone and it lands, resized, in their own
Shop's storage, with a public https URL the app can show.

**Jobs:**
1. Migration: a public Storage bucket `shop-media`; no client writes (the server signs uploads).
2. Server: `createUpload(shopId, kind, ownerUserId)` → checks Owner of that Shop (`requireOwner`),
   returns a signed upload URL for `shops/<shopId>/<kind>/<uuid>.webp`; `deleteMedia(path)` that
   refuses paths outside the caller's Shop.
3. Client `<PhotoInput kind="avatar|logo|gallery|cover">`: pick/take photo → square crop for
   avatar/logo → canvas resize (512 / 1600 px) → WebP → upload → returns URL. Progress + error notice.

**Done when:**
- `npx vitest run tests/engine/media.test.ts` passes: an Owner gets an upload path under their own
  Shop; a Barber-less stranger and another Shop's Owner are refused; `deleteMedia` refuses a path
  from another Shop.
- `npx playwright test tests/e2e/photo-upload.spec.ts` passes: a 4000×3000 JPEG test file uploads
  as WebP ≤ 512 px (avatar) and ≤ 1600 px (cover), and its URL loads (HTTP 200).

**QA criteria:** isolation tests above; a 12 MB file is refused with a clear notice (EN/ES);
works at 360 px; no secrets in client bundle (service key never shipped).

### M2 · Settings → Services & prices

**Goal:** the Owner manages the Shop's Service list: add/edit (EN + ES name, duration on the
15-min grid, buffer), reorder, archive.

**Jobs:** 1. page `/app/settings/services` (list + add/edit sheet, archive with confirm) on the
existing `saveService` / `archiveService`; 2. e2e spec. Turn the "Soon" row into a link.

**Done when:**
- `npx playwright test tests/e2e/settings-services.spec.ts` passes: add "Fade" 45 min → it shows
  in the list and on `/b/<shop>` once a Barber has a price for it; edit to 30 min; archive → gone
  from `/b`; a 20-min duration is refused with a notice.
- By hand: Settings → Services & prices on your phone, add a Service in Spanish view.

**QA criteria:** EN/ES; archive needs a confirm; axe 0; 360 px no sideways scroll.

### M3 · Settings → Barbers (list, add, delete)

**Goal:** the Owner adds a person to the team in seconds and removes them when they leave.

**Jobs:**
1. Engine: `deleteBarber` replaces `removeBarber`: Owner only; refuses itself (the Owner's own
   Barber) and refuses while upcoming confirmed Bookings exist (returns them); otherwise deletes the
   Barber row (cascade: past Bookings, prices, hours, gallery), their photos in Storage, and a tied
   login if it isn't staff elsewhere or a Platform admin. Optional `phone` column on `barbers`
   (Owner-only; never sent to `/b`).
2. Page `/app/settings/barbers`: list (photo/initials, name, "Not bookable yet" when no priced
   Service or no hours), **Add Barber** sheet (name required; photo, phone optional), 7th add shows
   the 6-limit notice; Delete with a confirm that says it also deletes their past Bookings; when
   refused, the upcoming Bookings show with Move / Cancel.
3. Tests.

**Done when:**
- `npx vitest run tests/engine/shop-admin.test.ts` passes, including new cases: delete refused
  with upcoming Bookings; delete removes past Bookings and gallery rows; Owner can't delete own
  Barber; another Shop's Owner can't delete; the 7th active Barber is refused (BB002).
- `npx playwright test tests/e2e/settings-barbers.spec.ts` passes: add "Luis" with a photo →
  appears in the list and (after a price + hours) on `/b`; delete Luis → gone from list and `/b`;
  a Barber with a Booking tomorrow can't be deleted and the Booking is shown with Move/Cancel.
- By hand: add yourself a test Barber on your phone, then delete them.

**QA criteria:** Shop isolation (server actions with another Shop's ids refused); phone never in
`/b` HTML; confirm copy is plain about deleting history; EN/ES; axe 0; 360 px.

### M4 · Barber profile page

**Goal:** each Barber has one page where the Owner edits everything Clients see about them.

**Jobs:** (split by section, parallel)
1. Profile: photo, name, bio EN/ES, specialties (chips, ≤ 8), Instagram handle (new column,
   validated), phone. Uses `updateBarberProfile` (+ Instagram/phone).
2. Gallery: 3–6 photos, add/remove/reorder, "add at least 3" nudge (`setGallery`).
3. Services & prices for this Barber: toggle each Shop Service on, price, optional duration
   override, special price with end date (`setBarberPrice`, `removeBarberPrice`, `setSpecialPrice`).
4. Hours & days off: weekly hours with a break, days off list (`setWeeklyHours`, day-off ops).
5. `/b` Barber sheet shows Instagram + bio in the Client's language with fallback (Q35).

**Done when:**
- `npx playwright test tests/e2e/barber-profile.spec.ts` passes: set bio (EN only), Instagram,
  3 gallery photos, a price of $30 for Haircut, Mon–Fri 10–18 → on `/b/<shop>` in Spanish the
  Barber shows the English bio, the Instagram link, 3 photos, $30, and Monday slots from 10:00.
- `npx vitest run tests/engine/shop-admin.test.ts` passes (Instagram/phone validation cases).
- By hand: open a Barber, change their photo from your phone camera.

**QA criteria:** phone never on `/b`; Instagram rejects URLs/spaces, accepts `@name` or `name`;
EN/ES; light/dark; axe 0; 360 px.

### M5 · Settings → Shop profile (+ booking page header)

**Goal:** the Owner shapes how the Shop looks to Clients, and sees the week at a glance.

**Jobs:**
1. Migration: `shops.logo_url`, `cover_url`, `about_en`, `about_es`. Engine `updateShopProfile`
   (Owner only; name, phone, address, about, logo, cover; **not** the slug).
2. Page `/app/settings/shop`: the fields above with `<PhotoInput>`; a "This week" card (Bookings,
   Walk-ins, Time saved) linking to the Dashboard; the booking link shown read-only.
3. `/b/<shop>` header: cover, logo, name, address with a map link, tap-to-call, about (Q35 fallback).

**Done when:**
- `npx vitest run tests/engine/shop-admin.test.ts` passes: Owner updates profile; a Barber-less
  stranger and another Shop's Owner are refused; slug can't be changed through it.
- `npx playwright test tests/e2e/settings-shop.spec.ts` passes: upload a logo + cover, write the
  about in English → `/b/<shop>` shows them (and the English about in Spanish view); the "This
  week" card's number matches the Dashboard's.
- By hand: change your Shop's cover on your phone and open your booking link.

**QA criteria:** another Shop's `/b` unchanged (isolation); Lighthouse on `/b` not worse than
before by more than 5 points (cover image sized and lazy where below the fold); EN/ES; axe 0; 360 px.

### M6 · Retire Barber sign-in

**Goal:** the app is the Owner's alone; nothing invites, routes or shows screens for Barber logins.

**Jobs:** remove the invite UI/route (`src/server/invites.ts` callers), the Barber-only Day
routing and the **Me** tab (Owner tabs: Today · Dashboard · Settings); `/app/me` redirects to
`/app/settings`; disconnect the dev DB's test Barber logins (user's OK first); update e2e specs
that sign in as a Barber (`day.spec.ts`, `dashboard.spec.ts` "a Barber is sent to their Day").

**Done when:**
- `npx playwright test` (whole suite) passes with no Barber sign-in left in any spec.
- `npx playwright test tests/e2e/sidebar.spec.ts` passes with 3 Owner tabs.
- By hand: sign in as Owner → Today; tabs show Today · Dashboard · Settings; `/app/me` → Settings.

**QA criteria:** no dead links (crawl `/app/*` for 404s); EN/ES; axe 0.

### M7 · Plans: Free and Pro

**Goal:** each Shop is Free or Pro; Pro-only features are locked on Free with a clear,
friendly "Pro" tag and a way to ask for the upgrade.

**Jobs:**
1. Migration: `shops.plan text not null default 'free' check (plan in ('free','pro'))`; existing
   Shops set to `'pro'`. Engine helper `requirePro(shop, feature)`; Platform admin
   `setPlan(shopId, plan)` (logged like other admin actions).
2. Gating: online card payments (booking page offers pay-in-person only on Free; Stripe connect
   row locked), Client texts (outbox skips texts on Free, like `sms_enabled = false`), Telegram
   (row locked). The server enforces it, not just the UI.
3. UI: a gray "Pro" tag on locked Settings rows and an "Ask us to upgrade" sheet with our contact;
   Settings shows the current plan.

**Done when:**
- `npx vitest run tests/engine/plans.test.ts` passes: a Free Shop's booking can't start online
  payment; no text outbox rows for a Free Shop; `setPlan` needs a Platform admin and logs it.
- `npx playwright test tests/e2e/plans.spec.ts` passes: Free Shop → `/b` has no "Pay online";
  Settings shows "Pro" tags; switching the Shop to Pro (test helper) brings "Pay online" back.
- By hand: demo-shop still offers "Pay online" (it starts on Pro).

**QA criteria:** gating can't be bypassed by calling server actions directly; existing Pro Shops
unaffected; EN/ES; axe 0.

## Needs you (collected)

- **Pro's price: $50/month** (user, 2026-11-14). Landing wording drafted in M7 for the user to see before commit.
- Test Barber logins: **OK to disconnect where necessary** (user, 2026-11-14); only logins tied to test Barbers, never the Owner's.
- Push to GitHub after each milestone (your OK each time).
- Later, not in this plan: self-serve Shop sign-up (Q1 b), in-app upgrade checkout, Premium tier,
  Barber sign-in as a paid feature, Telegram keys.

## Out of this plan

Self-serve sign-up · billing/checkout · Premium · loyalty/POS/store · Barber stats on profiles ·
Online payments Settings page and Connect Telegram (both Pro, later) · the calendar redesign (P3)
and Settings motion (P4) · `/admin` (U4) · launch hardening (U5).
