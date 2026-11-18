# Progress: Barber Master (booking system)

Last updated: 2026-11-17, end of the dad-demo session (live on Vercel; everything pushed, last code commit `23eb230`). Source of requirements: `Barbershop Booking System PRD.md`.

## Where we are

### START HERE next session (written 2026-11-17, end of the dad-demo session)

**Next session: security audit** (the user's plan). Live at https://citrus-system.vercel.app (Vercel Hobby, deploys `main` from GitHub). Suggested scope: server actions and route handlers (authz via `access.ts`, input validation), `/auth/confirm` (OTP on POST only, `next` limited to `/app…`), `/m/<token>` manage tokens, cron routes (`CRON_SECRET`), Telegram and payments webhooks (secret/signature checks), RLS on every table, the public `/api/availability*` routes (rate limits, enumeration), Turnstile on public forms (still the always-pass test keys on Vercel?), env/secret handling, headers (CSP/HSTS), and that the `dadtest:*` scripts never ship or run against production.

State now:
- **Live and verified on the phone profile:** `/b/dad-test` with the optional email field; a real booking emailed samirflores13@gmail.com (outbox `email_confirmation` done). `dad-test` is reset (no Bookings).
- **Database connections (important):** Vercel's `DATABASE_URL` uses the Supabase **transaction pooler, port 6543**; the session pooler (5432) ran out of its 15 slots and took the site down once. Local `.env.local` now uses the **direct connection** (`db.<ref>.supabase.co:5432`, user `postgres`): from this machine the 6543 pooler stalls mid-query (backends stuck in `ClientRead`), and 5432 shares its 15 slots with the live site. All 182 engine tests pass on the direct URL.
- **Text consent:** the "you agree to get texts" line now shows only when the Shop has texts on (`f69bdac`); no Twilio, so nobody gets texts.
- **Phone smoothness** (Pixel 7 profile, 4x CPU; scripts and numbers in gitignored `.impeccable/review/jank/`): landing scroll 654 → ~210 dropped frames (Velaris at 0.5x on phones), contact-form freeze gone (paper-shader style shipped in `layout.tsx`, shader/Turnstile mount at idle), view transitions scoped per section and skipped under reduced motion, no WebGL metal ring under reduced motion, booking time tap 200 → 133 ms (no layout read when the details step mounts). Remaining: each booking tap still spends 50-130 ms (4x CPU) rendering the next step (would need a booking-flow refactor, e.g. memoizing `SlotPicker`); language switch ~0.3 s; the hero gradient is slightly grainier at 0.5x.
- **Landing form:** leads are saved and emailed to Platform admins; no self-serve payment. Shops are created by hand (`onboardShop`/`platformAdmin()` have no admin UI yet); billing and plan are set by hand.
- **Not confirmed yet:** Telegram bot created and webhook registered on the live URL; `npm run dadtest:telegram` run; dad's Owner link (`npm run dadtest:owner -- <email> --site https://citrus-system.vercel.app`); `<URL>`/`<CORREO>` filled in `docs/prueba-papa.md`; dad's test itself.
- **Vercel MCP** needs the user to approve access to the `omars-projects` team before runtime logs can be read.

### Earlier: START HERE (written 2026-11-17, dad-demo build session)

Goal: the user's dad tests the app alone on his phone, in Spanish, on a separate Shop `dad-test` ("Barbería de Prueba", plan pro, online payment and texts off), as Client and Owner. Built and committed locally (`487bb3f`..`ee7896a`, not pushed); QA passed (typecheck, lint, 28 unit + 182 engine tests).
- **Client emails** (`src/server/client-email/`, migration `20261117090000_client_email.sql`): optional email on `/b`, confirmation/cancelled/rescheduled outbox rows in the same transaction, EN/ES by `bookings.locale`. Not gated by plan; also sent as a receipt when the Client changes it. Until a domain is verified in Resend, only the Resend account's own address receives them.
- **Drain right away** (`src/server/drain-soon.ts`, `after()`): every outbox-writing action drains its rows; `vercel.json` daily backstop crons (`/api/cron/daily` 11:00 UTC, `/api/cron/dispatch` 12:00 UTC; Hobby = once a day, so the Owners' 7:00 email can be an hour late in winter). 30 s tolerance for app/DB clock skew (about 26 s seen on this machine).
- **Scripts:** `npm run dadtest:setup` (idempotent), `dadtest:owner -- <email> [name] --site <url>` (prints a `/auth/confirm` link: a button page so WhatsApp previews don't spend the one-time token; about 1 hour), `dadtest:reset` (only dad-test Bookings/Clients/outbox), `dadtest:telegram [-- barber]` (one t.me link per Barber; open all in dad's Telegram so one chat gets every alert).
- **Telegram alerts in Spanish** when the linking Telegram app is in Spanish (migration `20261117100000_telegram_locale.sql`). Email fallback subject suffix, daily and refund emails are still English only.
- **Gap found:** no UI calls `createTelegramLink` (Settings only shows a Pro row). Build the real linking screen before real users.
- **Checklist for dad:** `docs/prueba-papa.md` (fill `<URL>` and `<CORREO>`).
Next: user creates the Telegram bot and Vercel project and sets env vars (names in `.env.example`; skip Twilio/Stripe; `CRON_SECRET` needed for crons; `NEXT_PUBLIC_SITE_URL` before build), adds `https://<name>.vercel.app/**` to Supabase redirect URLs; then push, register the Telegram webhook on the live URL, run the dadtest scripts with `--site`, smoke-test on the user's phone, then dad tests. Before real users: production Supabase, verified Resend domain, Twilio/A2P, legal name, Telegram linking UI.

### Earlier: START HERE (written 2026-11-17, end of the fourth session)

Everything below is committed and pushed to `origin/main`. Open items, in order:
1. **Get the user's reaction** to the round-five changes and follow-ups below (dark theme, calendar motion, barber step, pager, landing phone, clearer phone hovers, no "today" tile). They saw screenshots only. Lesson from this round: the user rejects effects they didn't ask for (a phone hover glow, a drifting background); tell workers not to add extras and flag any new effect before shipping.
2. **Possibly faint `/b` row hover in light mode:** `.c-row:hover` is about 96.9% on white (read from CSS, not measured); the landing phone's equivalent was made clearer on request. Ask the user before changing `/b`.
3. **Leftover test data in demo-shop:** an open Booking Nov 17 12:30 PM with Carlos, "Visual Check" (718) 555-0101 (past the online cutoff: cancel in `/app/day`, or a DB cancel only with the user's OK), plus several cancelled "Visual Check" Bookings and Client rows.
4. **/m not restyled for desktop by eye:** Job C checked `/m/invalid-token` only; a real manage page at ≥1024px wasn't seen. The shared `client-shell.tsx` column change applies there too.
5. **Production:** set `NEXT_PUBLIC_SITE_URL` (calendar events fall back to the page origin anyway). `DESIGN.md` was updated by `impeccable-documenter` for the green check, both grounds, pager, calendar motion and hero phone.
6. **Known trade-offs from round five:** on phones the times list can grow downward once when a longer day loads (never jumps up); the landing phone's `.hp-screen` copies the `/b` light token values by hand, so token changes need a matching phone update. (The documenter's drift items, the button/pay-card overshoot and the Tone Not Shadow wording, are fixed in `d4d3464`/`d167171`.)
7. Older open items from the second session (dashed fields, booked-step choices, day-change height jump, unused dictionary string, demo photos, "text 2 hours before" claim, book-pay-online e2e) are listed under the second session's START HERE below.

### Fifth round follow-ups 2026-11-17 (all pushed)

- `d4d3464`: "Book now" and payment cards settle without overshoot (300ms cubic-bezier(.22,1,.36,1)); the `/b`/`/m` ground blobs are static (drift removed, user didn't ask for it); the landing phone's hover glow and rim light removed (user didn't ask for them). Docs `d167171` (DESIGN.md: Client pages are the exception to Tone Not Shadow; no phone hover; static ground).
- `0c78597` (Job F, QA PASS): hovers inside the landing phone made clearly visible in light (rows tint the whole line ~1.24 luminance ratio, chevron nudges 2px; days darken with a ring; times lift 1px on a deeper shadow; Back pill; button lifts 1px). The phone's day strip no longer marks "today".
- `65c3b00`: the real calendar (`src/components/slot-picker.tsx`) no longer gives today a separate grey tile when another day is chosen; only the chosen day is marked. `/b` already opens with today chosen (`todayIn(timezone)`). Today is still announced to screen readers (`aria-current="date"`).
- Job G (QA PASS, this commit): the user clarified "today is November 17th, THAT is the day that must be highlighted by default, whatever the current today is". The landing phone's day strip now starts on the real New York date (client-only via `useSyncExternalStore`, null server snapshot, so the landing stays static and hydration-safe) and shows today + 5 days in the page locale (`dateLocale` en-US/es-US; fixed `day`/`dayShort`/`week` strings removed). Today is chosen by default and after "Book again". One ink tile `.hp-glide` glides between days (translate only, 320ms cubic-bezier(.22,1,.36,1), whole-pixel end, stays in the strip); digits crossfade; times fade 90/140ms with no height change; reduced motion instant. Committed `4ea5014`.
- Then (user: "fix it and make the better decision"): today keeps a hairline ring (no fill) once another day is chosen, on `/b` (`.c-day.is-today::after`, ink 34%) and in the phone (`.hp-day.is-today::after`); the ring fades out while today is the chosen (ink) day, like iOS Calendar. The phone re-reads the NY date every minute (`subscribeMinute`), so it rolls over at midnight. `landing.spec.ts` now asserts the phone opens on today's NY date, pressed (12/12 pass).

### Fifth round 2026-11-17: dark theme, calendar, barber step, pager, hero phone (all QA PASS; committed `33e5513`, pushed)

User asks (after seeing round-four screenshots): premium Apple-style dark theme; smooth day-click animation in "Elige la hora" plus deeper hour tiles; nicer "Elige tu barbero" and bottom price; visible pager in dark; landing phone matching the real UI, less bouncy hour pick, no blur on hover. Five `bm-worker` jobs (A, E first; then B, C, D) + one `bm-qa` each.
- **A (dark):** `--paper` oklch(12.5% 0.005 262) charcoal, cool top light (`--c-ground`) + three dim blobs (`--c-aura`, slate blue/umber/white; static — the drift animation was removed on the user's request, the ground never moves); lighter elevated surfaces (`--surface` 30.5%, `--raised` 36.5%), top-lit rims, four-layer soft shadows. Card vs ground 1.73, muted 6.2:1 on surface. Both dark blocks identical.
- **B (calendar, `src/components/slot-picker.tsx` + CSS):** glitch was a spring pop on the new day with an instant vanish on the old, a dim-then-rebuild-and-replay of the times list, and a phone height jump. Now each day has a `.c-day-ink` layer that crossfades (old 160ms out, new 200–280ms in, scale ≤1); the calendar times list stays mounted (`key="times"`) and dims to 0.5 once; phones keep the tallest list height per Barber+Service. Staff strip unchanged. Hour tiles: five-layer `--c-tile-rest` (light), rim + contact shadow (dark); press sinks 1px, no scale on `.c-day`/`.c-time` (orchestrator fix after QA). Also fixed a chosen time showing white text on a light tile.
- **C (barber step + dock):** `.c-avatar*` monogram discs (inverted disc for "Any available barber"), `.c-price*` tabular sans prices, quieter Profile pill (`.c-chip-quiet`); `.c-dock` glass with a 40px disc, service/barber line and larger price. No new strings.
- **D (pager):** glass track with local `--pg-*` tokens, upcoming 30–38% ink < done < capsule; ease-out, no overshoot. Dark upcoming dot vs track 2.95.
- **E (hero phone):** `.hp-*` rewritten to mirror `/b` light (cards, pager dots, raised times, gloss button, green check); calm pick motion (cubic-bezier(.22,1,.36,1), scale 0.9→1); the 3D tilt (cause of hover blur) removed; the worker's replacement rim glint + halo glow was removed too (user: not asked for), so the phone has no hover effect. Unused `landing-pop` removed.
- Checks: lint + typecheck clean; e2e book-now, manage, barber-profile, landing pass.

### Fourth round 2026-11-17: six /b milestones (all QA PASS; committed `74e725b`, pushed)

User asks: new step indicator, green centred check, Google Calendar link instead of the raw URL, reserve button hides again on scroll up, desktop at 100% zoom not oversized/colliding, light theme with real Apple-style depth. Four `bm-worker` jobs + one `bm-qa` each.
- **A (step indicator + booked step):** `.c-pager*` iOS page control (done dots, ink capsule for the current step, glass track, spring slide; role=progressbar). Booked check uses new `--c-success` green (light oklch 64% 0.17 150, dark 72% 0.19 150), check + heading centred. Raw URL + Copy row removed; "Add to Google Calendar" link (`googleCalendarHref`, UTC dates; manage link base = `NEXT_PUBLIC_SITE_URL` else `window.location.origin`). Copy reworded ("Need to change or cancel? Use the button below.").
- **B (reserve dock):** `RevealDock` uses two observers on the sentinel (show at 0px, hide once the end is >160px below the screen) + `recheck()` on focus leaving the dock and when `force` ends; hide = quick slide-down/fade, reveal = spring.
- **C (desktop sizing):** ≥1024px: 38rem column, one-row shop header, step label + pager on one row, h2 22px, buttons 48px, fields 46px, service rows 64px, barber rows ~68px, calendar cells 42px, time card = nav width (46.5rem). Summary dock on steps 1-3 is static (in flow) from 768px up, so it never covers the calendar. Checked at 1280x720, 1366x768, 1440x900, 1920x1080, 1024x576, 853x480.
- **D (light theme):** cool ground (#ebecf0 top → `--paper` #d4d5db), three drifting low-chroma blobs (blue-grey, sand, white; 36s, transform only, off under reduced motion), five-layer card shadows, card vs ground contrast 1.5-2.1 (was 1.19), muted 5.66:1 on paper. Glossy primary capsule (`--c-btn-gloss`, label `--c-btn-ink` white); headings semibold -0.02em. Dark unchanged.
- Checks: typecheck + lint clean; e2e book-now, manage, race, barber-profile 9/9.
- **Needs the user:** a test Booking from QA is still open in demo-shop: Nov 17 12:30 PM with Carlos, "Visual Check" (718) 555-0101 — past the online cutoff, cancel it in /app/day (or OK a DB cancel). Several cancelled "Visual Check" Bookings and their Client rows remain too. Set `NEXT_PUBLIC_SITE_URL` in production so calendar events carry the real domain (falls back to the page origin anyway).

### Third session 2026-11-17: booked check animation + deeper light-mode depth (committed `adce419`, `ca85193`; pushed)

- **Booked check (`/b` final step):** the red disc springs in (scale 0.3 → 1.06 → 1, 560ms), the white tick draws itself (`stroke-dashoffset`, `pathLength=1`, from 380ms), then one soft ring ripples out and fades (from 640ms); a red drop-shadow glow under the disc. CSS `.c-check*` in `globals.css`, markup in `booking-flow.tsx`. Reduced motion: no animation, the resting state is the finished check. Checked frame by frame in the browser by pausing the animations (a real booking was not made, to avoid DB rows and texts).
- **Light-mode depth, Apple-style:** `--c-depth`, `--c-depth-hi`, `--c-lift`, `--c-btn-shadow(-hi)`, `--c-press` now four layers (hairline contact, tight key, medium, wide ambient), stronger. New tokens `--c-sel` (chosen day/time ink tile) and `--c-tile-rest` (free time tiles stand a hair off the card); the dark blocks set both to the old values, so dark mode is unchanged. Time-tile hover uses `--c-press`.

### Earlier: START HERE (written 2026-11-17, end of the second session)

**What this session did (all QA PASS, committed and pushed: `f0f0feb` hero phone, `feaf62a` footer removed, `5d77b6b` Client depth/buttons/calendar/reveal):** two rounds of user asks, each split into two parallel `bm-worker` jobs with their own files, then a `bm-qa` pass per job, small fixes by the orchestrator. Details of both rounds below. Checks at the end: typecheck, lint, landing e2e 12/12, book-now + manage + race 8/8, day.spec 14/14 (the walk-in test passed this time). Not re-run: `book-pay-online` (needs `npm run stripe:listen`; its click step was changed to scroll to the bottom first).

**Leftovers from QA runs:** about eight cancelled "Visual Check" Bookings and their Client rows (phones (718) 555-01xx) remain in demo-shop. Harmless, but they show in the Owner's lists; delete them before the demo if they bother the user.

**Open / ask the user next:**
1. The dashed name/phone fields in the user's screenshot never reproduced in Chromium; the field rim is now an inset shadow. If the user still sees dashes, ask which browser.
2. Kept on purpose, confirm with the user: on the real booked step "Book another" is the raised white capsule (Manage is the one ink button there); the /b booked card has depth but no ticket notches (only /m and the hero phone have them); the submit button reads "Booking…" while pending.
3. A day change in the time card ends with one un-animated height change when the new list is longer (animating height would break the transform/opacity rule). Ask if it bothers them.
4. The unused "Bookings by Barber Master" dictionary string can be removed.
5. Still open from earlier: demo-shop photos, the "text 2 hours before" claim (also on the hero phone's booked screen), the contact card's Send ring, book-pay-online e2e, the demo talk (see below).

**Round 2, contrast + motion (QA 10/10 PASS; `5d77b6b`, `feaf62a`), after the user: "light version is hard to see, no depth on the service menu, calendar select glitches, Reserve button's white outline gets lost, remove the footer logo + line, show the reserve button only at the bottom":**
- Light ground `--paper` #ebebee, rims black 7–10% (`--c-rim-in` on controls inside cards), three-layer `--c-depth`, stronger button shadow; dark surface 20.5%/raised 27.5% with a lighter top rim. Muted text ≥ 5.5:1 everywhere.
- The white ring round "Book now" was the compact Dock's white glass capsule; now `.c-dock-bare` (no capsule, a ground-coloured fade behind the button).
- Calendar: the chosen tile's fill + shadow are one `::before` layer that springs by scale (the old flicker = shadow before fill, scale jump); the last day's list stays dimmed while the next loads (no skeleton, no shrink-then-grow); stale "no free times" words hide at once; the day/month fades start at 0.4–0.45 opacity (no blink). The staff strip's hover rule is scoped to `.c-slots:not(.c-timecard)`.
- Footer (wordmark + rule) removed from `client-shell.tsx` (/b and /m). The "Bookings by Barber Master" dictionary string is now unused.
- Details step: the reserve bar stays hidden (`inert`, aria-hidden) until a sentinel at the bottom is seen, then slides up and stays; shows at once when the page fits; Tab from the last field reveals and focuses it; errors/pending force it visible. e2e book-now/book-pay-online/race scroll to the bottom before clicking it (book-pay-online not re-run, needs Stripe CLI).

**Round 1, depth + buttons (QA PASS; `f0f0feb`, `5d77b6b`), after the user's six asks (Book now / Book another buttons, pick other days in the hero phone, dock colliding with the phone bottom, depth on the ticket and everywhere, glitched payment card outlines, plain "Next free day"):**
- Hero phone (`hero-phone.tsx`, `.hp-*` block after `.hero-phone-bezel` in globals.css): every day in the week row is selectable (ink tile springs over, times per day, Sunday = "No free times this day" EN/ES, ticket shows the picked date); the dock now clears the home bar by 10px (screens 22px bottom padding); layered depth on cards, mask-cut ticket notches, raised day tile/chip, staggered rise-in; "Book another" = `.hp-btn` (ink capsule, inner highlight, layered shadow, 1px hover lift, 0.97 press spring, sheen on appear/hover). QA 9/9.
- Client pages (`/b`, `/m`, Client block of globals.css): `.c-btn-primary` = the same ink capsule (white in dark) + sheen + spring + `aria-busy` spinner; `.c-btn-secondary` same motion on a raised white capsule. Payment = two separate `.c-pay` cards (rim and selected ring are box-shadows, ring 30% ink, so no doubled/misaligned border; the old glitch was a 2px focus outline inside a shared `overflow-hidden` frame). Fields: rim is an inset shadow on a transparent solid border, invalid = solid ring (the user's dashed fields didn't reproduce in Chromium; ask which browser if they persist). Empty day = inset well, icon tile, "Next free day →" capsule with arrow nudge. `/m` ticket deeper, inset-shadowed notches. Step items rise in. Staff day board unchanged (rules scoped to `.client-page`). QA PASS; kept on purpose: "Book another" on /b stays secondary (Manage is the one primary there), the submit button's name reads "Booking…" while pending, /b booked card has depth but no notches.

**iOS card pass, 2026-11-17, first session (pushed), after the user: "the input boxes, buttons, the highlighted days look glitched; I want an iOS card feeling, premium, modern, minimal; cards and buttons need depth or a shadow; fonts from the landing":**
- `.client-page` now redefines `--paper` (soft grey; black in dark), `--surface` (white; graphite oklch 19.5% in dark), `--raised`, `--line`, `--muted`, so the `@theme inline` utilities follow on Client pages only. `--font-jetbrains` is remapped to Hanken there, so every `font-mono` on /b and /m reads in the landing face with tabular figures.
- Cards 20px corners, hairline rim, layered `--c-depth` in both themes; lists in `.c-card.divide-y` get iOS separators inset from the left (`--sep`, 1rem; the Barber list sets 5.375rem past the faces). Selected rows = a quiet `--raised` fill (no ink frame). Chips = white capsules on `--c-press` (grey fill inside a card); a Barber row's hover tints the whole line. Fields = 52px white wells with a `--c-focus` halo (no dashed invalid state). Buttons 52px.
- Glitches fixed: the staff day-strip rules (edge mask, tab borders, h3 rule line) leaked into the time card; now scoped to `.c-slots:not(.c-timecard)`. Calendar days stretched on wide columns; now true squares (max 2.875rem), today = soft fill + bold, chosen = ink tile on a shadow. Time buttons = filled grey, lift on hover.
- `Notice` and `PayTag` carry `c-notice` / `c-tag`; on Client pages only they become a rounded card on its shadow (grey inside a card/sheet) and a filled tag. "No free times" is a solid rounded well.
- Landing hero phone (`hero-phone.tsx`) restyled to the same look: #f2f2f4 ground, 18px white cards, inset separators, no mono, the time screen as one card (week of rounded squares with dots + grey time rectangles), lit "Book another".
- Verified by screenshots (`.impeccable/review/ios/`: `shots.mjs` = the 4 /b steps phone light/dark + desktop; `flow.mjs` = profile sheet, filled details, booked, /m, Change time, cancel sheet, cancelled, light + dark; it books then cancels a real "Visual Check" Booking at demo-shop; `../hero-phone/shots-ios.mjs` = the phone EN/ES). Typecheck, lint, e2e landing + manage + book-now 19/19, barber-profile/race/plans pass.
- The Client recipe comment in globals.css is updated (the old "mono for times" note is gone).


**Done 2026-11-17 (committed, not pushed):** slot picker restyled with the Client recipe `0a2cadc` (the picker owns `.c-slots`; rim/glint fall back to `--line` on the staff day board; "No free times" is a dashed well with a `.c-btn-secondary` "Next free day →"). Landing hero phone redrawn in the new Client look `938b1d5` (monogram header, 4 step segments, ruled cards, day strip + mono time pills with taken times hidden, summary dock, ticket on "You're booked"; new `heroPhone.week` EN/ES). Checks: typecheck, lint, landing e2e 12/12, book-now + manage + day 13/14.

**Later on 2026-11-17 `1b5106f`:** from a user reference ("Request studio time" calendar): `/b` and `/m` now pick the day from a **month calendar** in one card (`SlotPicker calendar`; Sunday-first, wholly past weeks dropped, ‹ › between the at most two months of the 31 bookable days, chosen day = ink disc, today ringed, the times below a divider under the full date). The staff day board keeps the day strip. Visitors from the landing (`/b/demo-shop?from=site`, both landing links) get a "Barber Master" back pill in the glass top bar (to `/` or `/es`); real Clients never see it. No per-day availability dots (would need a range API). **Watch:** e2e tests click `getByRole("tab").nth(i)` as "days from today"; on the calendar that only holds inside the current month, so near month end those tests can break (book-now, plans, race, barber-profile). `/m` not checked by screenshot (manage e2e passes).

**Premium pass, 2026-11-17 (`baaa8ad`, `f2d3bb7`), after the user: "the navbar does not look like the landing, the UI looks nothing like the reference, no shadows, no animations, the buttons look cheap, the theme changer isn't the dashboard's":**
- `src/components/client-nav.tsx`: the landing's glass nav on `/b` and `/m` (shared `.nav-*` rules now `:is(.landing, .client-page)`, light/dark glass of their own, contracts on scroll), the dashboard's `ThemeSwitcher`, language as a nav link; with `?from=site` the wordmark leads back and a liquid metal "Talk to us" shows from md. `ThemeToggle` is no longer rendered anywhere (only `THEME_COOKIE` is still imported from it).
- Time step = one raised card (`.c-timecard`, `--c-lift`): month left, times right, 46.25rem wide from md (lines up with the nav), stacked on a phone (past weeks hidden there). Rounded-square days, a dot for days with free times (`engine.getOpenDays` + `/api/availability/days`), today ringed, "Today" link, a duration chip; times as rounded rectangles in Geist (not mono) scrolling inside the card from md. Motion: month slides from the side asked, the chosen day settles with a spring, times rise in one after another.
- `.c-btn-primary` lit (sheen, inner highlight, drop shadow), `.c-btn-secondary` rim + depth, dark cards get depth.
- e2e 29/30 (the pre-existing walk-in failure).

**Still open from the list below:** 1 (demo-shop photos, user), 3 ("text 2 hours before" claim: also in the hero phone's booked note, user's call), 5 (Send button ring, ask the user), 7 (book-pay-online e2e), 9 (demo talk). Item 6's "Payment label under the dock" is how a sticky dock behaves (focused fields already scroll clear); left as is.

**New, pre-existing:** `day.spec` "add a walk-in from the big button" fails with and without today's changes (it adds a walk-in "now"; run at 7:42 PM it stayed open with an alert, likely outside the Shop's hours). Make the test use the injected clock or a time inside hours.

### Earlier: START HERE (written 2026-11-16, end of session)

Today's work is logged under "Done 2026-11-16" and "Later on 2026-11-16" below. **Left for later (user, 2026-11-16: "we'll leave this for later"), pick from here:**

1. **Demo Shop photos.** demo-shop has no cover photo or logo, so `/b/demo-shop` (the landing's "See a real booking page") shows the compact no-cover header. Add a cover and logo (Settings → Shop profile, or upload landing photos to the dev DB) so the premium header shows. Asked the user; they said not yet.
2. ~~**Slot picker restyle.**~~ Done 2026-11-17. `src/components/slot-picker.tsx` is shared by `/b`, `/m` and the staff day board; it's styled from `/b` through `.c-slots` but not restyled itself, and its "No free times" button still uses the old `btn-ghost`. Restyle it with the Client recipe and re-run `day.spec`, `book-now`, `manage`.
3. **"A text 2 hours before" claim.** The $50 pricing card (and earlier landing copy) promises Client texts, which don't go out until the Twilio keys are set. Either set up Twilio before showing it, or soften the copy.
4. ~~**Landing hero phone.**~~ Done 2026-11-17. `src/app/_landing/hero-phone.tsx` still draws the old (pre-restyle) booking screens; redraw them in the new Client look.
5. **Send button on the contact card.** Its liquid-metal ring is the only thing still moving on the solid form card (kept on purpose). Ask the user whether it should be still there.
6. **Smaller notes from QA:** the details step's "Payment" label sits under the dock until scrolled; meta text on `/b` is 12–15px (DESIGN.md asks 16px for body; read as primary text only); the "How your first month works" unrevealed steps fail axe contrast on purpose (faint preview); the setup photo is a narrow crop at 390px.
7. **Not re-run:** `book-pay-online` e2e (needs `npm run stripe:listen`).
8. **Crab agents mod** (a Claude panel showing background agents as a designer crab and a developer crab): started and stopped by the user, nothing written. Only if they bring it up again.
9. **Then the DEMO talk** (still open from 2026-11-15, see below): where it runs, what data, what the dad does, what must be real, and when.

### Earlier: START HERE (written 2026-11-15, end of session)

**Tomorrow, in order (user, 2026-11-15):**

1. **Finish polishing the landing:**
   - Make sure no photograph gets glitched or cut by the new section transitions (setup, pricing, How photo boxes, hero panel). Check at 1440/1024/768/390, EN and ES.
   - **Remove the glowing circle inside the pricing cards** (the radial top highlight on both cards, `pricing.tsx` + its rules in `globals.css`).
   - Then show the user the whole landing and ask what else needs polish.
2. **Discuss the DEMO** (showing the app to the user's dad). Open questions already put to the user: where it runs (Vercel `*.vercel.app` recommended), what data (shared dev DB + demo-shop, or a real Shop for the dad), what he does (watch, sign in as Owner, book as a Client), what must be real (Resend works; Stripe stays test; texts/Telegram log-only?), and when (decides the every-minute cron). Checklist under "Demo deploy plan" below.

**Done 2026-11-16:** removed the radial glow inside both pricing cards (`pricing.tsx`; the glow was an inline style, nothing in `globals.css`). Photo check: viewport screenshots while the hero, setup and pricing panels and the three How photos cross the screen, at 1440/1024/768/390, EN and ES. No photo is cut, gapped or glitched by the tonal joins or the widen clip. Noted, not changed: at 390px the setup photo is a narrow vertical crop (mostly building, the pole shows at the left edge). Next: show the user the whole landing and ask what else to polish, then the demo talk.

**Later on 2026-11-16 (all QA'd by bm-qa, committed and pushed):**

- Landing: arrow buttons in the pricing cards (`src/components/ui/arrow-button.tsx`, `.arrow-btn`; the shaft grows into the chevron as one shape); new $50 card copy (risk reversal first; EN/ES); simpler premium footer on its own darker surface (`.l-foot`, no fade from the Velaris band, big wordmark linking to `/` or `/es`, drawn underlines); all FAQ text white; the contact card solid (no glass, nothing moves on it except the Send button's liquid-metal ring, kept on purpose); the hero's glow circles replaced by the Velaris gradient (`releaseOffscreen` on both Velaris instances, ≤ 3 live WebGL contexts). DESIGN.md updated.
- **Client pages restyled premium** (`/b/<shopSlug>` and `/m/<token>`; logic, a11y names and e2e unchanged; both themes): glass capsule bar in `client-shell.tsx`; Shop header with full-bleed cover + overlapping logo, or a compact monogram when there is no cover; address/call pills; 5-segment step progress, sliding steps, Service/Barber cards with photos, time pills, a sticky glass summary dock on phones; `/m` as a ticket card with a calm cancel sheet. Style recipe at the top of the "Client pages (premium)" block in `globals.css` (`--c-rim`, `--c-rim-top`, `--c-glass`, `--c-depth`, `.c-*` classes).
- **Open:** demo-shop has no cover photo or logo, so `/b/demo-shop` shows the compact no-cover header; add them in Settings → Shop profile before the demo. `src/components/slot-picker.tsx` (shared with the staff day board) is styled from `/b` via `.c-slots` but not restyled itself (its "No free times" button still uses `btn-ghost`). The $50 card says "Each client gets a text 2 hours before" while Client texts wait on Twilio keys. book-pay-online e2e not re-run (needs the Stripe CLI). A crab-agents panel mod was started and stopped by the user (nothing written). The landing hero phone still draws the old booking screens.

**Done 2026-11-15, second half (all committed and pushed):**

- Hero: removed the service-area pill above the title `fede333`; no language label inside the hero phone `7f4a9c1`; the page scrolls over the hero phone `c82d77f`.
- Lead form: Neighborhood field removed (server still accepts it), compact two-column layout, 44–46px fields `4ca9c78`; keeps input after a server error (`onSubmit`, not a form action) `3888583`.
- **Liquid metal button** (user's component, `src/components/ui/liquid-metal-button.tsx`, `@paper-design/shaders@0.0.82`): the form's Send `f2446c2`; "Talk to us" in the nav and phone menu, both pricing cards (second one `tone="quiet"`) `9856405`. The shader mounts only near the screen and drops its WebGL context when it leaves (≤ 3 live contexts on the page).
- Nav: hover box replaced by a centred 1px underline; glass rim + glint; the CTA keeps an even inset (13px open, 7px contracted) `9856405`.
- Look: darker grey ramp (ground oklch 13%, band 15.5%, panel 17%, raised 21%, hairline 28%, muted 71%), sections meet by tone (`.l-band`, footer `.l-rise`) instead of lines, cards on photos panel-toned with a lit top rim, text on photos ≥ 4.8:1, paddings aligned `a6029b5`.
- **Velaris band** (user's WebGL gradient, `src/components/ui/velaris.tsx`): dark graphite/steel only (user: no red), behind FAQ + Contact only, reads `--l-bg`; the contact card is static glass (panel 90% over a 40px blur, no animation). Fixed the FAQ "glitch": opening an answer resized and re-faded the canvas; now the canvas height is stepped and the pattern anchored to the top `0269a5d`. DESIGN.md `6ef3a9c`, `1b3803a`.
- `src/components/ui/` is new (shadcn convention) for pasted components; no shadcn CLI, no lucide/clsx/tailwind-merge installed.

**Not QA'd by a separate bm-qa pass (only the workers' own checks + orchestrator's typecheck/lint/landing e2e 12/12/screenshots):** the last round (`a6029b5` `9856405` `0269a5d`). Run one full-page QA tomorrow before the demo.

**Done 2026-11-15, first half** (landing grilling Q1–Q9 + four UI jobs, each QA PASS):

- Landing copy: first month free, then **$50 a month** (the Free plan is not advertised); Barbers get alerts "on their phone or by email" / "on Telegram or by email, once they're connected"; no Barber day-screen claims; walk-ins "from the day screen". `7cfd529`. PRODUCT.md + CLAUDE.md price rule updated.
- Equal-size card groups (pricing/setup row subgrid, facts) `4292cbc`; floating glass nav that contracts on scroll down and opens on scroll up (`nav-scroll.tsx`) `6a773b5`; hero phone drawn as a real device + ≤ 5° pointer tilt `39673cd`; hero glow fades in `deeb255`; DESIGN.md `959132c`.
- **Barber alert email** (user: the Owner adds Barbers' emails): migration `20261115090000_barber_email` (applied to the dev DB), `updateBarberProfile` email + `INVALID_EMAIL`, alerts use `coalesce(barbers.email, login email)` and drop the `/app/day` link for Barbers, field on the Barber profile in Settings. `8a09135` `713ab44` `4058630`.

- Later the same day: no language label inside the hero phone `7f4a9c1`; the page scrolls over the hero phone (screens never scroll, 476px tall below 640px) `c82d77f`; premium lead form (inset fields, restyled select, gradient Send) and it keeps the input after a server error `3888583`; DESIGN.md `1b3803a`. All QA PASS.

**Later (after the demo):** Telegram alerts for Barbers (Pro), a Settings page for Client texts, real-iPhone photo upload test, P3 calendar, P4 Settings polish.

**Open from QA:** the nav between 768 and 1023px in Spanish only gets shorter, not narrower (tight links); the "How it works" mini cards differ in height on purpose; the How-it-works stage still shows "Dre's Thursday" as an illustration (not asked yet).

### Earlier: START HERE (written 2026-11-14, end of session)

**State:** every PLAN.md milestone (M1–M7) is built, QA'd and pushed to `origin/main`. The dev DB (`barber-booking-dev`) has every migration through `20261114140000_shop_billing_guard`. 162/162 engine tests; e2e green in groups (book-pay-online needs `npm run stripe:listen`; run e2e in groups because of the Supabase sign-in rate limit).

**How we worked this session:** the orchestrator gives one small job per `bm-worker` agent (brief names the files it owns), then a `bm-qa` agent checks it against PASS/FAIL criteria; the orchestrator fixes or re-briefs, then commits by path (`git commit -- <paths>`, never `git add .`). Migrations are applied with a throwaway node script (`node --env-file=.env.local`, runs the SQL in a transaction and inserts into `supabase_migrations.schema_migrations`), deleted after use.

**Next, in order:**
1. **Landing-page grilling session** (the user asked for it). Open questions to start with:
   - Price: PRODUCT.md says the only price shown is "first month free". Should the landing now mention Pro at $50/month (and Free)? Draft EN/ES and show the user before committing.
   - Hero claim: "Your barbers get an alert on their phone" while Telegram alerts aren't built. Soften it or build Telegram first?
   - Anything else on the landing the user wants polished (they liked the rail; reference sites: truehorizon.ai "How we work", the user's local "moises website").
2. ~~DESIGN.md "Navigation per role"~~ done 2026-11-15.
3. **Demo deploy** (still the user's priority from 2026-11-13: show the app to their dad). Checklist under "Demo deploy" further down; `NEXT_PUBLIC_SITE_URL` must be set at build time.
4. Later, small milestones: Telegram alerts for Barbers (Pro), a Settings page for Client texts, real-iPhone test of photo uploads (M1 open item), P3 calendar, P4 Settings polish.

**Known small issues:** another Shop's Barber page renders not-found with HTTP 200 (streaming); abandoned unsaved uploads stay in storage; `/b` offers card payment from `payments_enabled` alone (not checking `payment_account_id`), pre-existing.

**NEXT (2026-11-14): `PLAN.md`** — Shop profile, Barber profiles, team management, Free/Pro plans; milestones M1–M7 from a grilling session (Q1–Q36). Key reversals of earlier decisions: Barbers never sign in (Me tab, Barber invite and Barber Day view retired in M6); Shop logo/cover uploads are now in; deleting a Barber deletes their past Bookings. Plan confirmed by the user 2026-11-14.

- **M1 Photo uploads: DONE 2026-11-14** (`9d826ba` server, `713b0ff` client; not pushed). Bucket `shop-media` (public, 3 MB, WebP + JPEG) via migrations `20261114090000`, `20261114091000`, applied to the dev DB by the orchestrator (node script running the SQL + a row in `supabase_migrations.schema_migrations`, the same history the earlier migrations use). `media()` in engine.ts; actions `createUploadAction(kind, format)` / `deleteMediaAction` in `src/app/app/_media/actions.ts`; `<PhotoInput kind value onChange label locale>` in `src/components/photo-input.tsx`; dev-only harness `/app/dev/photo` (404 in production). QA 10/10 PASS (isolation on real storage, no service key in client JS, anon writes blocked, EN/ES notice, 360px, axe 0, JPEG path). **Open:** test on a real iPhone (camera + Safari's WebP/JPEG fallback) once M3's Add Barber screen exists. 
- **M2 Services page: DONE 2026-11-14** (`91b434a` reorderServices, `933f1a0` page). `/app/settings/services`: add/edit (EN/ES name, 15-min durations, cleaning time), up/down reorder, archive with confirm. QA 9/9.
- **M3 Barbers list/add/delete: DONE 2026-11-14** (`6446780` engine, `444cd89` page). Migration `20261114100000` (barbers.phone_e164, Owner-only). `deleteBarber` replaced `removeBarber` (refused with upcoming Bookings or for the Owner's own Barber; cascades past Bookings); `removeTeamMember` in `src/server/team.ts` also deletes photos and a login no other Shop uses. QA 10/10.
- **M4 Barber profile page: DONE 2026-11-14** (`da63eed` access fix, `46f9149` engine, `f9ab473` /b, `888d7e2` page). Migration `20261114110000` (bio_es, instagram). `/app/settings/barbers/[barberId]`: profile, gallery, prices, hours/days off. QA found a cross-Shop price overwrite in the pre-existing `setBarberPrice` (D1) plus silent no-ops; fixed at `authorizeForBarber` + `requireBarberInShop`/`requireServiceInShop`, re-QA PASS. Known: another Shop's Barber page renders not-found with HTTP 200 (streaming); abandoned unsaved uploads stay in storage.
- **M5 Shop profile: DONE 2026-11-14** (`cbbd7e0` engine, `f7f2e96` /b header, `76d18ca` settings page, `b7245d9` a11y fix for the compact language button). Migration `20261114120000` (shops.logo_url, cover_url, about_en, about_es). `/app/settings/shop` takes the Shop from the session; "This week" card matches the Dashboard. /b header on step 1 only. QA 10/10 (Lighthouse drop ≤ 2 points, CLS 0).
- **M6 Retire Barber sign-in: DONE 2026-11-14** (`f093cc1` shell, `bfeee3d` linkBarberLogin removed, `4206794` e2e). Tabs: Today · Dashboard · Settings; `/app/me` → Settings; a legacy Barber-only login sees "ask your Owner". `onboardShop` lives in `src/server/onboard-shop.ts`; `src/server/invites.ts` deletion was swept into the landing commit `7059468` by mistake (harmless). No dev-DB logins needed disconnecting (only Carlos = the Owner's own Barber). QA 8/9: the 9th was a pre-existing Dashboard day-bar label mismatch, being fixed in M7's UI job. **DESIGN.md "Navigation per role" still lists Barber rows and the Me tab: update it.**
- **M7 Plans: DONE 2026-11-14** (`aecc04d` engine, `e5e5276` billing guard, `cebdb73` UI, `e48d0e6` Dashboard a11y). Migrations `20261114130000` (shops.plan; existing Shops → 'pro', new Shops default 'free') and `20261114140000` (trigger: the `authenticated` role can't change plan, billing_status, status, sms_*, payments_enabled, payment_account_id; QA found an Owner could self-upgrade through RLS). On Free the server turns off online payments, Client texts (incl. reminders), Telegram linking and payments onboarding (PRO_ONLY). Settings shows the plan; on Free, gray "Pro" tags open an "Ask us to upgrade" sheet ("Pro is $50 a month", Talk to us → /#contact); on Pro, texts show On/Off, Telegram "Soon". 162/162 engine tests; plans.spec e2e. Pro price **$50/month** (user). **Open:** landing price wording (PRODUCT.md says the only price is "first month free"); draft and show the user before changing.
- **Landing, 2026-11-14:** first-month rail reworked to the user's taste after several rounds (rejected: scroll-scrubbed reveal, stacked cards). Final: the white line draws down with its tip 60% down the screen; unreached steps are a faint preview with an empty ring; when the line meets a bubble it pops, then when / title / body / three tags rise in (`rail-reveal.tsx`, IntersectionObserver on the bubble). Copy rewritten after truehorizon.ai "How we work" (Setup & go-live · Launch & first bookings · Routine & fewer calls · Review & decide; no Barber sign-in claim). Hero panel got two slow-drifting soft lights. Commits `7059468`…`335d7f3`. **Open:** the hero still says Barbers "get an alert on their phone" while Telegram is not live; ask the user. **Next: a grilling session to polish the landing page** (user, 2026-11-14).
- **Pushed to `origin/main` on 2026-11-14** with the user's OK.

**Direction from the user (2026-11-13, after P2, all pushed to `f50e318`):** "we are getting to the final stage." **Next priority: a demo deploy** so the user can show the app to their dad. P3 (calendar), P4 (Settings life) and further polish (animations, components) come **later, in small milestones**.

### Session handoff (2026-11-13, end of session): how to start, run and stop things

**Left running at the end of this session** (Claude's process kills were blocked by the permission check; the user was given this command):

```powershell
foreach ($id in 36708,12100,21412,7944,34772,31780,11488) { taskkill /PID $id /T /F }
```

PIDs `36708 12100 21412` = leftover QA scripts `.impeccable/review/qa-p2/qa*.mjs`; the rest = the dev server on :3000. If they're still alive next session (PIDs may have changed), find them with:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Select-Object ProcessId, CommandLine
Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 3000,3001,3100,3200,3417,3600,3700
```

Only stop processes whose command line mentions `Sistema_Barberias` or `qa-`; the Codex runtime node process belongs to another app. Stopping a process needs the user's permission (ask them, or have them run it with `!` in the prompt).

**Start of the next session:**

1. Read `CLAUDE.md`, `AGENTS.md`, this file, `DESIGN.md` (`## App (Operate mode)` for app screens).
2. Check the ports above are free. If :3000 is already a `next dev` for this repo, reuse it (a second `npm run dev` exits with "Another next dev server is already running").
3. `npm run dev` in the background (<http://localhost:3000>). If pages reload in a loop: stop it, delete `.next`, start again.
4. Only for payment work: `npm run stripe:listen` in the background; its secret must match `STRIPE_WEBHOOK_SECRET` in `.env.local`.

**Agents (project-local, `.claude/agents/`):**

- `bm-worker`: one small job per agent (one screen or concern). The brief lists the files it owns and the ones it must not touch, the checks to run, and "don't build, don't commit". Run jobs that don't share files in parallel; if two must share a file (e.g. `dashboard/page.tsx`), give each one its exact part. Short reports (< 25 lines).
- `bm-qa`: read-only inspector (Sonnet). Give it numbered PASS/FAIL criteria for that job only; it writes scripts and screenshots to `.impeccable/review/qa-<job>/`. Afterwards check that its scripts aren't still running (the P2 QA left three node processes behind).
- The orchestrator (main session) fixes small QA defects itself, runs typecheck/lint/e2e, commits in small conventional commits, updates this file, and pushes after the user's OK.
- Design guidance: `/impeccable` and `~/.claude/skills/design-taste-frontend` (guidance only).

**Checks and scripts used this session:**

- `npm run typecheck`, `npm run lint`, `npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/sidebar.spec.ts` (reuses the dev server on :3000).
- Screenshot runs: `DASHBOARD_SHOTS=p2b npx playwright test tests/e2e/dashboard.spec.ts` writes to `.impeccable/review/p2b/`; the sidebar spec has skipped screenshot tests too.
- Staff sign-in for scripts: a service-role magic link (pattern in `tests/e2e/day.spec.ts`); Supabase throttles after ~15 sign-ins. Throwaway Shops with random slugs, deleted afterwards (pattern in `tests/e2e/dashboard.spec.ts`).
- axe: `@axe-core/playwright` isn't installed; QA injected axe-core from cdnjs (`axe-core/4.10.2`) with `page.addScriptTag`.
- In dev, the Next dev-tools indicator covers the bottom-left corner (the collapsed rail's EN/ES button); click it by keyboard or hide the indicator in tests. Not present in production.
- Don't run prettier on whole files (the repo isn't prettier-formatted). Don't run `npm run build` while workers are active (shared `.next`).
- To show the user: demo-shop has sample data for the weeks of Nov 2 and Nov 9 (`/app/dashboard?week=2026-11-09`).

**Demo deploy plan (not started; needs the user's go-ahead on each outward step):**

1. Vercel project from the GitHub repo (`OmarflorexAI/Barber-booking-system`), Next.js preset. The Vercel CLI isn't installed; use the Vercel MCP tools or the dashboard.
2. Env vars (names from `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` (the `*.vercel.app` URL, set before the build), `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, Turnstile keys (test keys are fine for a demo), `CRON_SECRET`, `MANAGE_LINK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `STRIPE_SECRET_KEY` (test), `STRIPE_WEBHOOK_SECRET` (a new endpoint secret for the deployed URL, not the `stripe listen` one). Twilio/Telegram stay unset (log-only stand-ins).
3. Supabase Auth: add the deployed URL to Site URL / redirect URLs so magic links come back to it.
4. Stripe test webhook endpoint at `<url>/api/payments/webhook` (Events from: Connected accounts).
5. Crons: the dispatcher needs every minute (Vercel Pro, or Supabase `pg_cron` + `pg_net`); for a demo, daily crons on Hobby are enough and booking still works.
6. The demo uses the shared dev Supabase DB (`barber-booking-dev`) and demo-shop with its sample data; sign the dad in as staff with `npm run staff:add`.

**The backend (B1–B6) is built, tested and pushed. Stripe payments work end to end in Stripe test mode (2026-11-10). Resend login emails work. The landing page (Cocoon template, missions L1–L4) is done and pushed (2026-11-12): `/` English and `/es` Spanish (static), legal pages, bilingual 404, SEO, motion, and `DESIGN.md`.** Twilio and Telegram are postponed (agreed 2026-11-10). **Next: mission G, the system UI grill. The user asked to start it at the beginning of the next session.**

### Session log 2026-11-12 (what this session did)

- Fixed the 77 VS Code "problems" (all markdownlint warnings in this file) and 98 ESLint warnings (vendored `.claude/**` and `.impeccable/**` scripts, now ignored in `eslint.config.mjs`).
- **L3 motion** (commits `b3a0bf6`, `9583ce2`, `d99661a`): CSS scroll-timeline motion plus 3 `<ViewTransition>`s. QA: 9/10 pass; its defects fixed. The user accepted the clip-path panels.
- **L4 ship-ready** (`bc96cb0`, `1a5aae8`, `4445634`, `a44d925`, `9e09429`, `7249be6`): the `/es` URL (user's choice), SEO, trimmed client JS, legal pages with the user's grill answers, the 404, `THIRD_PARTY_NOTICES.md`, the finish-review fixes and `DESIGN.md`. Idle Lighthouse: 94–98 everywhere, SEO/a11y/best practices 100. Simulated LCP 2.9 s was accepted (real LCP is 0.46 s; see L4 below).
- `CLAUDE.md` (untracked) updated for the current landing. Everything pushed to `origin/main`; no servers or agents left running.
- **Lessons for next time:**
  - Run Lighthouse only on an idle PC (check CPU first), and measure `/login` as a control; under load the landing's numbers are meaningless.
  - Parallel workers must not run `npm run build` (they share `.next`); the orchestrator builds.
  - The `impeccable-finish-reviewer` works only from saved full-page captures: take them first (`.impeccable/review/finish/shots.mjs`, reduced motion so panels show their final state).
  - Don't run prettier on whole files (the repo isn't formatted with it).
  - A `next start` left on a port makes the next one fail with EADDRINUSE and you end up measuring the old build: free the port first.

## Mission plan (START HERE next session)

This is the whole remaining job, in order. Each mission is one unit of work that ends with commits. Work through the missions top to bottom with the team and workflow below (used on 2026-11-12).

### The team (agreed with the user, 2026-11-12)

- **Orchestrator = the head builder** (the main Claude session). It follows this plan, runs the grill with the user, splits each mission into small jobs, hands them out, merges the results, runs the build and the final numbers, shows the user, commits and updates this file. It doesn't hand off decisions that belong to the user.
- **Workers = the builders** (`general-purpose` agents in the background). Each one does **one small job** with its own list of files. Jobs that don't share files run in parallel. Every brief says: the files to read, which files it owns and which it must not touch, the rules, the checks to run, "do not build, do not commit", and what to report back.
- **QA = the inspector** (a separate `general-purpose` agent that didn't write the code and doesn't edit it). It tests the work against the mission's pass criteria and reports **PASS or FAIL per criterion** with evidence, plus defects ordered by severity. Failures go back to the worker that owns the files (SendMessage keeps its context) or the orchestrator fixes them; QA re-checks when it matters.
- Design missions also use the impeccable agents: `impeccable-finish-reviewer` (needs saved captures) and `impeccable-documenter` (updates `DESIGN.md`).

### The workflow

1. **Start of session:**
   - Read `CLAUDE.md`, `AGENTS.md`, this file, `PRODUCT.md` and `DESIGN.md`.
   - Check that nothing stale is running (ports 3000, 3100, 3200, 3417, 3600, 3700).
   - Start `npm run dev` in the background, plus `npm run stripe:listen` for anything that touches payments.
2. **Grill first when a mission has open decisions** (`/mattpocock-skills:grill-me`):
   - Ask in rounds of numbered questions. Give a recommended answer for each, worded so "yes" accepts it.
   - Ask the whole frontier at once.
   - Look facts up yourself or with a worker; never ask the user for facts.
   - Record every answer in this file before building.
   - Missions marked **[grill]** need one; the others are already decided.
3. **Use `/impeccable` for design work:**
   - Run its `context` once per session.
   - For a new surface, write a direction contract with `impeccable surface-brief write`: THESIS, OWN-WORLD, STORY, FIRST VIEWPORT, FORM, FINISH.
   - Read `craft-floor.md` before any UI edit.
   - Modes: the landing is Persuade. The app screens are Operate: calmer and denser, but the same brand (`DESIGN.md`: grayscale, barber red for live signals, Geist).
4. **Build with workers** (see "The team"). Their checks: typecheck, lint, the relevant e2e and engine tests, `impeccable detect --json`, and screenshots in `.impeccable/review/` at 390 and 1440 px in EN and ES.
5. **Inspect with QA.** Then the orchestrator builds and re-checks the key numbers itself (for example Lighthouse on a production build, on a free port, with the PC idle).
6. **Show the user:**
   - screenshots and what changed
   - every copy claim the product might not back (the user confirms it or softens it)
   - anything the craft rules flag against a user decision
   - anything that needs the user (accounts, keys, choices)
7. **Commit when the user says so** (on 2026-11-12 the user said "fix what's needed, then commit"):
   - Small conventional commits, staged by path (never `git add .`).
   - Scan for secrets first.
   - End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
   - Update this file (status and next steps) and commit it too. Push only after the user's OK.
8. **End of session:** stop every server and agent you started; leave nothing running.

Rules for every mission:

- No fake numbers, testimonials, logos or prices. The only price claim is "first month free".
- Every user-facing string in EN and ES.
- Phones first: 360 and 390 px, tap targets ≥ 44 px, no sideways scroll.
- Respect reduced motion. Animate only transform and opacity.
- Never call a provider directly from a booking operation; write an outbox row.
- Stripe `sk_test_` keys only.

### Missions, in order

| # | Mission | Grill? | Status |
| --- | --- | --- | --- |
| L1+L2 | Landing foundation + sections | none (decided) | **DONE 2026-11-11** (`d496896`, `158c7ca`) |
| L3 | Landing motion | none (decided) | **DONE 2026-11-12** |
| L4 | Landing ship-ready | short [grill] for the /privacy and /terms wording | **DONE 2026-11-12**, pushed |
| G | System UI grill | **[grill]** | **DONE 2026-11-13** (`d57426d`: answers below, DESIGN.md "App (Operate mode)", 6 surface briefs) |
| U1 | Client booking `/b` + manage `/m` (with online payment) | covered by G | **DONE 2026-11-13** (`322f56f` … `48dbd8b`, see "U1 status") |
| U3a | Barber day view `/app/day` | covered by G | **DONE 2026-11-13** (`559301f` shell, `9d16eec` day view; see "U3a status") |
| U2 | Owner tools | covered by G + Dashboard grill Q38–Q42 | **PARTLY DONE 2026-11-13** (Dashboard, link+QR, export, rules, blocklist); premium pass P1–P5 + 4 Settings pages left (see "U2 status") |
| U3b | Barber profile, hours, Connect Telegram | covered by G | with or after U2 |
| U4 | Platform admin panel | short [grill] | after U2 |
| U5 | Hardening + launch | short [grill]: hosting, domain, payment provider | last |

**L3 Landing motion.** The full brief is in "Landing page v3 → Build status → M3" below.

- Build: the panels widen to full width, the photos fade in, the nav shrinks, and sections fade up.
- `<ViewTransition>` goes in exactly 3 places: the phone's screens, the language toggle, and moving between pages. Load `/vercel-react-view-transitions` and read `node_modules/next/dist/docs/` first.
- Validator: Performance ≥ 90 on an idle PC, CLS < 0.1, and nothing stuck hidden under reduced motion or with JS off.

**L4 Landing ship-ready.** The full list is in "Build status → M4" below.

- `/privacy` and `/terms` in EN/ES. The wording is written with the user; A2P 10DLC needs both pages.
- A restyled 404.
- SEO: metadataBase, canonical, sitemap, robots, structured data, and the fix for the description and title landing in `<body>`.
- `THIRD_PARTY_NOTICES.md`: the 5 photo credits and the Cocoon MIT notice.
- The full validator run against the pass criteria.
- Then the `impeccable-finish-reviewer` agent and the `impeccable-documenter` agent (which writes `DESIGN.md`).
- Push to GitHub once the user approves.

**L4 grill answers (2026-11-12):**

- Operator: "Barber Master" (brand name only) for now. **Launch prerequisite:** a real legal name or LLC on both pages before SMS registration (A2P 10DLC reviewers check it).
- Contact: a clearly marked placeholder (`support@[domain]`) until U5 sets up the domain and a verified Resend address. **Launch prerequisite.**
- Data role: each Shop owns its Clients' data (name, phone, bookings); Barber Master stores and uses it only to run that Shop's bookings. Clients ask the Shop first; we help. Export + deletion 30 days after a Shop cancels (PRD).
- Governing law: New York.
- Defaults Claude uses (no question needed): SMS section with the program (booking confirmation + one reminder 2 hours before, so about 2 texts per Booking), "Msg & data rates may apply", STOP to opt out and HELP for help, carriers not liable, mobile numbers and consent never shared or sold for marketing; no ads or analytics trackers; cookies only for language, sign-in, bot checks (Cloudflare Turnstile) and payments (Stripe); service providers named: Supabase (database), Twilio (texts), Resend (email), Telegram (Barber alerts), Stripe (payments), Cloudflare (bot checks), our host; no service for children under 13; "last updated" date; EN and ES. The pages are a plain-language draft, not legal advice: have them reviewed before launch.
- Also decided: the wide-panel clip-path (paint only) is the accepted approach (user, 2026-11-12).

**G System UI grill.** One grill session for the whole app, before any screen is built. Decide:

- How the landing's brand becomes the app's calmer Operate look: light or dark, density, type scale.
- Navigation between the `/app` areas for each role.
- The screen list for each mission below, and what each screen must show.
- Phone or desktop first for each role: Barbers are on phones; Owners may use both.
- Empty, error and loading states.
- Which existing screens (`/b`, `/m`, `/app/day`, `/login`) get restyled and which get rebuilt.

Output: the decisions recorded in this file, `DESIGN.md` extended to cover the app, and a surface brief per area.

**G grill answers (2026-11-13, 4 rounds, all confirmed by the user):**

- **Theme:** the app screens (`/b`, `/m`, `/app/*`, `/admin`) are **light by default, follow the phone's setting**, with a **sun/moon switch next to the language toggle** in the header of every app screen; the choice is saved in a cookie (like `lang`) and applied before paint (no flash). Dark mode = the landing's dark ramp (ground 6%, panel 11%, raised 14%, hairline 18%, ink 93%); no second dark palette. Light = achromatic (no warm tint; the old `--paper` warm tokens go). `/login` is always dark (the landing's look; it's the bridge).
- **Red:** the Live Signal rule carries over unchanged: the "now" line, the new-Booking dot, the booked check. Buttons are black (light) / white (dark) pills; errors are neutral notices; Cancel/remove are gray with a confirm step.
- **Fonts (user wants Google Fonts):** **Hanken Grotesk** for everything and **JetBrains Mono** for times, prices and numbers (tabular), across the **whole product including the landing** (One Family rule). Chosen from a specimen (`.impeccable/review/fonts/specimen.html`, gitignored).
- **Density:** 16px body, headings ≤ 1.5rem in the app, booking rows ≥ 56px, buttons ≥ 48px.
- **Device first:** Clients and Barbers on phones; Owners phone-first but laid out properly on desktop; Platform admins desktop-first, usable on a phone.
- **Navigation:** Barber = bottom tabs **Day · Me**. Owner = bottom tabs **Today · Dashboard · Settings** (+ **Me** if they cut hair), a left sidebar from 1024px. Platform admin = `/admin` with top nav **Shops · Failures · Access log** and a switch to `/app` when also Shop staff. **Sign out** at the bottom of Me (Barber), Settings (Owner), top nav (`/admin`). After sign-in: Barber → Day, Owner → Today, Platform admin → `/admin` (or `/app` if also staff).
- **Owner Today:** phone = one time-ordered list of all Barbers with Barber filter chips; desktop = one column per Barber (≤ 6). The Owner can do everything a Barber can for any Barber.
- **States:** loading = skeletons shaped like the layout (no spinners); empty = one sentence + the one next action; errors = a neutral notice next to the action, saying what to do, input kept.
- **Restyle vs rebuild:** restyle `/b`, `/m`, `/login` (logic and e2e kept); rebuild `/app/day` in the new shell (server actions kept).
- **U1 `/b`:** Service → Barber (photo or initials, "Any available" first, tap for profile + gallery) → Time → Details + payment → Done, a step counter on top; "Awaiting payment" and "Payment expired, pick a time again" states. Shop name leads the header; small Barber Master mark in the footer; no Shop logo uploads in v1. **Checkout is cards only** (cards, Apple Pay, Google Pay).
- **U1 `/m`:** summary (Shop, Barber, Service, time, price, paid or not), Change time, Cancel with a confirm that says whether a refund is coming; states: cancelled, past, refunded, "too late to change, call the Shop" with tap-to-call (`shops.phone` exists).
- **U3a Day:** date bar ‹ › + Today, red now line, a big **Add walk-in** button within thumb reach, row → sheet with **Arrived · No-show · Move · Cancel** + tap-to-call, "Paid online" tag (gray, card icon), finished rows dim.
- **U2 Settings** (each a phone-friendly page): Services & prices (specials) · Hours & closed days · Barbers (invite/remove, max 6) · Booking rules (cutoff + over-2h warning) · Blocklist · Online payments (Stripe status) · **Booking link + printable counter QR** · Export clients (CSV). **Dashboard:** this Monday–Sunday week's Bookings, Walk-ins, No-shows, Time saved, each with last week beside it, plus a bar per day; no fake goals or trend lines. **The user sends a dashboard reference image at U2.** No-shows keep counting as online Bookings and time saved (as built).
- **U3b Me:** Profile (photo, bio, specialties) · Gallery (3–6, the screen asks for ≥ 3) · Hours (weekly + break, days off) · Alerts (Connect Telegram by link/QR; "Alerts go to your email" until linked). **Photos upload to Supabase Storage**, resized on the phone first; initials when no photo. The Telegram screen is built now against the log-only stand-in; live test when keys arrive.
- **U4 `/admin`:** Shops list (status, texting, billing, 7-day Bookings) · Create Shop · Shop detail (SMS status, free/paid, minutes per booking, CSV import with line errors, support access with reason, cancel/reactivate/export) · Failures (retry) · Access log.
- **Process:** order **U1 (incl. product-wide fonts, theme tokens, dark switch; the landing's font swap) → U3a → U2 → U3b → U4 → U5**. Claude **commits each mission after QA passes**, then shows the user screenshots + the commit list; **push only after the user's OK**. The user asked to use multiple agents.

**U1 status (DONE 2026-11-13, committed, not pushed).** Built by workers (foundation; `/b`; `/m`; cards-only), checked by a separate QA agent (9/11 criteria pass first round; 12 defects fixed after), then by the orchestrator.

- Commits: `322f56f` cards-only Checkout · `79f7c0d` dark `/login` · `5a2dfa5` Hanken Grotesk + JetBrains Mono product-wide, achromatic light/dark tokens (`--paper --surface --raised --line --muted --ink --red`), sun/moon switch (`theme` cookie, inline script before paint, `ThemeSync`) · `ea49f4a` theme-color follows the cookie, input focus ring, `/login` html lang · `43dcb66` `/b` (5 steps, Barber sheet, slot picker, fresh Turnstile after an error, `UNPAID_LIMIT` wording fixed, html lang) and `/m` (awaiting payment, hold countdown, expired, cancelled + refund line, past, too late + tap-to-call, cancel sheet), shared `client-shell.tsx`, `notice.tsx`, `pay-tag.tsx` · `48dbd8b` e2e `book-pay-online` and `manage` specs.
- Checks: typecheck, lint, `npm test` 144 (one flaky run, see below), Playwright 31/31 (incl. a real Stripe test payment confirmed by webhook), build OK, axe 0 on `/b` and `/m` states, no sideways scroll at 360, detector `[]`. QA also ran a real refund through the dispatcher: Stripe refund succeeded, `/m` showed "Refunded".
- Fixed in env: `STRIPE_WEBHOOK_SECRET` in `.env.local` no longer matched `stripe listen` (new 38-char secret); replaced, old value kept as a comment.
- **Open:**
  - **Checkout still shows "Pay securely with Link" and "Klarna – Powered by Link"** although the session has `payment_method_types: ["card"]` (verified via the API). Comes from Link being on in the connected account's payment-method settings; turning it off is a Stripe Dashboard change for the user (or a payment-method configuration). Late payments are refunded automatically, so the risk is a refund, not lost money.
  - Lighthouse not re-measured after the font swap (CPU was 51%). Do it on an idle PC.
  - `tests/engine/payments.test.ts` "frees the time when the 10 minutes run out" counts holds across all Shops, so a leftover expired hold in demo-shop makes it fail once (it then releases it). Make it assert on its own booking.
  - 37 pending `barber_alert` outbox rows with `booking_id` null from old test runs sit in the dev DB; running `/api/cron/dispatch` with `RESEND_API_KEY` set would email them. Delete them (user's OK) before running the dispatcher in dev.
  - Day chips don't grey out closed days/days off yet (needs a month of availability). Demo Barber specialties are English only.
  - Copy that makes claims (check before launch): `smsConsent` (confirmation + reminder texts), "We hold your time for 10 minutes", refund lines ("on its way to your card", no timing promised).

**U2 status (2026-11-13, end of session; START HERE next session).**

Done and committed (not pushed after `3dc7572`): `8d93623` Settings list + `/app/settings/link` (URL, copy/share, printable QR sign; adds `qrcode`) + `/app/settings/export` (CSV route `export/download/route.ts`, 403 for non-Owners) · `de75497` `/app/settings/rules` (cutoff + over-2h warning) and `/app/settings/blocklist` · `36cf5e4` + `ec33ae0` `reporting().dashboardWeek` (totals, previous week, 7 days with `byBarber`/`byHour`/`noShows`/`timeSavedMin`, `hours` span, Barbers with a Mon–Sun `days` series) · `4f69d20` `/app/dashboard` (hero Bookings + gray deltas, Walk-ins/No-shows/Time saved cards, Mon–Sun bars, Bookings per Barber, week stepper; `--data`/`--data-soft` slate-blue tokens) · `81bf842` agents `bm-worker`, `bm-qa`. Settings guard `settings/_owner.ts`; e2e `settings-link`, `settings-rules`, `dashboard` specs.

**The user's verdict on the Dashboard (2026-11-13):** "good but very simple"; no animations, everything static. Wants: **hide/show sidebar**; **more life**; **at least one interactive section** (tap/click to see in-depth data); cards less plain; **smooth, clean, high-quality animations**; **the calendar section designed much better** (read as the Today/Day view; also upgrade the Dashboard's week chart); **Settings also needs animation and life**; "super premium and cutting edge". Use **taste-skill** (`design-taste-frontend` 2.5.1, updated this session via `npx skills add Leonxlnx/taste-skill -g`; guidance only, don't run its Chrome scripts; one scanner rated it "Critical Risk", the files were checked: markdown + optional checker scripts) **and `/impeccable`**. All earlier rules still hold: one data color only for charts, red only for live signals, gray deltas (no red/green), no goals/search/bells, EN/ES, transform/opacity animation only, reduced motion respected, ≥44px targets.

Demo data: 23 sample Bookings were added to **demo-shop** for the weeks of Nov 2 and Nov 9 (Clients named "Demo Rafa", "Demo Luz", … phones +1212555910x) so the user could see the Dashboard. Delete them when the user says so.

**Milestones left (in order, each one small `bm-worker` job, then commit):**

1. **P1 Motion system + collapsible sidebar. DONE 2026-11-13 (committed).** API for P2–P4: tokens `--ease-out`, `--ease-spring`, `--dur-fast` 150 / `--dur-base` 240 / `--dur-slow` 420 ms; utilities `.enter` (stagger `style={{"--i": n}}`, 40 ms/step, cap 10), `.press`, `.lift`; `<CountUp value locale format="number"|"duration" fractionDigits duration />` and `<Reveal index as>` in `src/components/motion/`. User answers (2026-11-13, next session): (a) **yes, a very soft low shadow on cards** (light mode only; dark uses the tone step), DESIGN.md updated; (b) **DESIGN.md updated** to the three timings 150/240/420 ms; (c) **yes, a compact EN/ES button** at the bottom of the rail, next to the theme switch. The original brief follows for reference: Brief: motion tokens/utilities in globals.css (`.enter`, stagger via `--i`, `.press`, `.lift`, all inside `prefers-reduced-motion: no-preference`), `src/components/motion/count-up.tsx` (+ `reveal.tsx`), sidebar collapse to an icon rail ≥1024px (toggle with `aria-expanded`, cookie `sidebar=collapsed|expanded` applied before paint by the root inline script → `<html data-sidebar>`, `[` shortcut), sliding active-tab indicator + press feedback on the phone tab bar, subtle page entrance, `tests/e2e/sidebar.spec.ts`. Partial files in the tree: `src/app/layout.tsx` (inline script already reads the sidebar cookie), `src/app/globals.css`, `src/app/app/_shell/sidebar.tsx`, `dictionaries.ts`. 
2. **P2 Dashboard redesign. DONE 2026-11-13 (committed `d5dc3e8` DESIGN.md, `85c9015` rail EN/ES, `80e062f` dashboard; not pushed).** Built by 3 small `bm-worker` jobs (cards+week picker; charts+drill-down sheet; rail EN/ES), checked by `bm-qa` (6/8 first round; fixed after: sr-only tables caused 372px sideways scroll at 360 → wrapped in `div.sr-only`; day-bar names now start with the visible text "2 Tue, …" for WCAG 2.5.3). New files `stat-card.tsx`, `sparkline.tsx`, `day-chart.tsx`, `barber-bars.tsx`, `drilldown-sheet.tsx`; `.card-depth`, `.spark`, `--spark-fill` in globals.css. **Open:** with JS off every `/app` page shows only the shell skeleton (layout-level `<Suspense>` in `src/app/app/layout.tsx`; app-wide, pre-existing; accepted for a signed-in staff app unless the user objects); CountUp doesn't count on a full page load by design (would flash the real number to 0); no swipe-down on sheets; axe was run by QA from a CDN script (`@axe-core/playwright` not installed); prettier flags the new files (repo isn't prettier-formatted). Original brief: richer cards (soft depth, inner hairline, a 7-day sparkline in each stat card from `days`), CountUp numbers, bars that grow in on load with stagger, today's bar highlighted with a count bubble (ref 4), hover/press states. **Interactive drill-down:** tap a day bar → a panel/sheet with that day's by-hour chart, by-Barber split, no-shows and time saved; tap a Barber → their week sparkline + numbers. A better week picker. Use the 4 references in `.impeccable/review/refs/` for layout and finish only (not their colors or goals).
2b. **P2.5 Dashboard "fun" pass. DONE 2026-11-13 (uncommitted).** User asked: "ensure the dashboard doesn't look plain, make it fun to use." All from real counts, one data color, red untouched, transform/opacity only, motion-safe: hero **one chip per Booking** (no-shows hollow, `tokens.tsx`, `.token` pop) · **Highlights** strip: busiest day, busiest hour, top Barber with a crown (`highlights.tsx`, `.crown`; facts in `week-facts.ts`, which now also holds `intl`/`noon`/`hourLabel` so server components can use them) · **Busy hours** day×hour heatmap with diagonal ripple entrance, hover/tap/arrow-key readout in a live region (`heatmap.tsx`) · per-day chart **metric switch** Bookings/Walk-ins/No-shows with a sliding pill; bars are now fixed-size and `scaleY`'d so they morph · **rank badges** on Bookings per Barber (crown for 1st) · **← / →** flip weeks (`week-keys.tsx`, `aria-keyshortcuts`). EN/ES strings added. e2e `dashboard.spec.ts` extended (6 pass; stat cards below the fold are now scrolled into view because CountUp holds them at 0 off-screen). Screenshots in `.impeccable/review/p6/`. Not yet: `bm-qa` pass, axe run, DESIGN.md note for the heatmap/tokens. **Fixes the same day:** (1) sidebar hide/show "glitch": the content's FLIP slide ended at once because Lightning CSS minifies `--dur-slow: 420ms` to `.42s` and `parseFloat` read 0.42 ms; new `src/components/motion/css-time.ts` (`cssDurationMs`) used in `sidebar.tsx` and `nav.tsx` (the page entrance had the same bug). (2) The "Platform admin" link 404'd (`/admin` is U4); hidden behind `ADMIN_PANEL_READY = false` in `_shell/staff.ts` (sidebar, Settings row, no-Shop screen). Flip it with U4. (3) **Theme switcher** (user's request, 2026-11-14, from a shadcn `theme-switcher-1` that used next-themes + motion): rebuilt with no new deps as `src/components/ui/theme-switcher.tsx`: System · Light · Dark radiogroup (arrow keys, roving focus), 44px options, thumb springs via `translate` from `<html data-theme>` (CSS in globals.css → "Theme switcher", right before hydration); "System" deletes the `theme` cookie. In the staff shell only: sidebar footer (stands up vertically in the collapsed rail), phone header (with the compact EN/ES square), no-Shop screen. `/b`, `/m` and `/login` still use the old sun/moon `ThemeToggle`. Strings `themeSwitch` EN/ES; e2e "the theme switcher picks System, Light or Dark" in `dashboard.spec.ts`.
3. **P3 Calendar (Day/Today view) redesign** (after P1): a real time grid (blocks sized by duration, hour gridlines, the now line on the grid), a swipeable week strip date picker, smooth sheet open/close (and swipe-down to close), animated row state changes (arrived/no-show/undo), Owner desktop columns as a proper multi-column calendar.
4. **P4 Settings life** (after P1): staggered list entrance, row press/hover, smooth page transitions between Settings pages, animated success states (Saved, Copied, Unblocked), QR reveal.
5. **P5 QA** with `bm-qa` (P2–P4 criteria: motion smooth at 60fps, reduced-motion final states, axe 0, no sideways scroll at 360, red/data-color rules, e2e green), then the orchestrator: build + one Lighthouse run on an idle PC, show the user in the browser (open a signed-in session for the user's email via a service-role magic link, as done this session), commit, push after OK.
6. **U2 remaining Settings pages** (one job each): Services & prices (with specials) · Hours & closed days · Barbers (invite/remove, max 6) · Online payments (Stripe status + connect button). Turn their "Soon" rows into links.
7. **U3b Me:** Profile (photo upload to Supabase Storage, resized on the phone), Gallery (3–6), Hours & days off, Alerts (Connect Telegram link/QR; the actions already exist in `day/actions.ts`). Replace the temporary Me copy.
8. **U4 `/admin`:** Shops list, Create Shop, Shop detail, Failures + retry, Access log; then flip the `// U4: "/admin"` landing line in `_shell/staff.ts`.
9. **U5 Hardening + launch** (needs the user: hosting, domain, payment provider, Twilio/Telegram keys, Link off in Stripe).

**U3a status (DONE 2026-11-13, committed, not pushed).** Two workers (shell; day view) + a QA agent (narrowed after the usage limit hit: 5/5 checked criteria pass).

- Shell `src/app/app/layout.tsx` + `_shell/` (`getStaff()` once per request; `--tabbar-h`, `--shell-bottom`); stub pages `/app/me` (name, language, sign out, temporary "our team sets this up" line), `/app/settings` (8 sections as plain rows, admin link, sign out), `/app/dashboard` (one line). Landing after sign-in is `/app/day` for everyone (U4: one line marked `// U4: "/admin"` in `_shell/staff.ts`). Callback blocks `//`, `/\` and absolute `next=`.
- Day view `src/app/app/day/`: `day-board.tsx` (rows, now line by translateY, new dot = online Booking confirmed in the last 2 h, row sheet, cancel confirm with refund copy that depends on `sms_enabled`/payment, move via new `moveAsStaffAction` → `rescheduleBooking`, walk-in sheet), Owner chips on phones and per-Barber columns ≥1024px. Telegram button removed (comes back in Me, U3b; its actions stay in `day/actions.ts`).
- QA: typecheck/lint, e2e 13/13 (`day.spec.ts` 6), a Barber's tampered server actions on another Barber's booking refused, redirects safe, axe 0 on Day/sheets/Me/Settings/Dashboard, no sideways scroll at 360, walk-in pill doesn't cover the last row, red only on now line + dot. Fixed after QA: h1 on the not-linked view, `viewportFit: "cover"` (safe-area insets work), Owner title says "Day" on other dates.
- **Open (small):** no swipe-down to close sheets; walk-in start time not editable and no "next free" offer; "new" dot is a fixed 2 h window (DESIGN.md says "since the Barber last looked"); unused keys `day.noServices`, `notMember`; page `<title>`s English only.
- **User answers (2026-11-13, after U3a):**
  - **Undo: yes.** Arrived/No-show → back to Confirmed, and a mistaken Walk-in can be removed. **DONE**: engine `undoAttendance` + `removeWalkIn` (walk-in becomes cancelled, no outbox rows, leaves the stats), 3 engine tests + 1 e2e step, gray "Undo" chip and "Remove walk-in" with a confirm in the row sheet.
  - Spanish tab names **"Perfil" (Me) and "Resumen" (Dashboard) approved.**
  - The 37 orphan pending `barber_alert` rows (booking_id null, from old test runs) were **deleted** with the user's OK; the 11 done and 20 skipped ones are kept as history.
  - **Pushed** to GitHub (`509ab8a..79bb3c6`) with the user's OK.
  - Payments confirmed working end to end in Stripe test mode. The Link/Klarna-via-Link button on Checkout is a Stripe Dashboard setting on the connected account (user to turn it off).
  - **Dashboard references** received: 4 images in `.impeccable/review/refs/` (gitignored): ref1 big "98" hero number + stat row with deltas, ref2 quick-stat cards, ref3 profile card + "Developed areas" horizontal bars, ref4 Flusync per-person bars + Mon–Sun Activity bars. The user also likes the taste-skill (Leonxlnx); it is already installed as `~/.claude/skills/design-taste-frontend` (copy from April 2026); use it with `/impeccable` for polish.
  - **Dashboard grill (Q38–Q42, 2026-11-13):** one soft **data color** (muted slate-blue, contrast-checked light/dark) **only for chart bars and per-Barber bars**; cards stay neutral, red stays live-only · week-over-week changes as **gray ↑/↓ + "+N vs last week"**, never green/red · layout: hero **Bookings this week** + delta; row **Walk-ins · No-shows · Time saved** with deltas; **Mon–Sun bar chart** (today highlighted, count on the bar); **Bookings per Barber** horizontal bars with photo/initials (right column on desktop); **‹ week ›** stepper · **no** goal bars, search, bells or upgrade buttons · **no money** on the Dashboard for v1 (Booking prices aren't takings).
- **Token note (user, 2026-11-13):** the session hit the 5-hour usage limit mid-QA. From now on every mission is split into **small agent jobs** (one screen or concern each, short reports, narrow QA).

**U1 Client booking (`/b/<shop>`, `/m/<token>`).**

- Restyle both pages to the G decisions.
- Online payment choice and the Checkout redirect, plus "awaiting payment" and "payment expired" states.
- Fix the "Book now" button and the "2 upcoming bookings to pay at the shop" wording.
- Cards-only Checkout (open from earlier).
- Tests: engine tests, plus a Playwright journey "book and pay online" on the phone profile.

**U3a Barber day view (`/app/day`).** The Barber's day on a phone: Bookings, Walk-ins, cancel and move, and the paid-online marker. It uses existing engine operations.

**U2 Owner tools.**

- Settings for everything in B5: Services, prices, specials, hours, closed days, cutoff, blocklist, inviting and removing Barbers.
- The all-Barbers calendar.
- The dashboard: weekly Bookings and time saved. Settle the no-show question first.
- The client CSV export button, which the landing page's copy depends on before launch.

**U3b Barber profile.** Profile and gallery, weekly hours and days off, and Connect Telegram with a QR code (needs the Telegram keys).

**U4 Platform admin.** The B6 data already exists. Screens:

- Shops list and create Shop
- client CSV import
- SMS registration status
- the free/paid flag
- the failures view
- the support access log
- 30-day deletion

**U5 Hardening + launch.**

- Sentry.
- Playwright journey 2: the Barber gets an alert; the Client cancels from the text link and is refunded.
- The Vercel project, env vars and crons.
- Production Turnstile keys and a verified Resend domain.
- Twilio and Telegram live.
- The payment provider decision, Square or Stripe (see the research notes).
- Every landing launch prerequisite under "Copy approved" below is true.
- Each Shop's go-live list.

### Needs the user (collected)

- Twilio and Telegram accounts and keys. These block U3b's Telegram screen and the launch claims.
- The payment provider for production (U5).
- The no-show question: does a no-show count as an online Booking and as time saved? This comes from B5; settle it before the U2 dashboard.
- The two pill labels on the landing are kept by the user's choice (the finish review and `DESIGN.md` record them as a "don't add more" exception).
- Before launch: a legal name/LLC for `OPERATOR`, a real `CONTACT_EMAIL`, and `NEXT_PUBLIC_SITE_URL` set at build time.
- Pre-existing, for U1: on `/b/demo-shop`, `<html lang>` stays `en` after switching to Spanish.

### Landing page v3: Cocoon template (decided 2026-11-11; DONE and pushed 2026-11-12, kept for reference)

The navy "barber-pole" landing below is being **replaced**. Template: `C:\Users\admin\Downloads\cocoon-template-1.0.3\cocoon-template-1.0.3` (templatedeck.com, MIT; Tailwind 4 + vanilla JS, static HTML). **Rebuilt as React + Tailwind v4 in our app**, never copied in as-is. The system UI gets its own grill session **after this ships** (order then: `/b` + `/m` → Barber day view → Owner tools → Platform admin).

Decisions:

- **Kept:** the content rules (only "first month free", no fake numbers/testimonials/logos, EN/ES) and most of `landing.ts`; new copy in EN and ES. The interactive hero phone stays, restyled.
- **Deleted:** everything else of the old landing (WebGL gradient, pole buttons, stepper, price board, glass nav, Big Shoulders/Instrument Sans). The 3D-head leftovers go first, in their own commit.
- **Look:** template grayscale + a small barber red (status dots, timeline dot, booked check). Geist + Geist Mono via `next/font`. New SVG wordmark with a scissor-ring mark (favicon + OG image too), user approves it first. This brand later carries into the app, in a calmer, denser form.
- **Page order:**
  1. Nav: How it works · Setup · Pricing · FAQ · Español/English · "Talk to us"
  2. Hero: pill "For barbershops in the Bronx & upper Manhattan"; the phone sits in the wide panel that grows to full width on scroll; no rings
  3. "Why" block: "Stop answering the phone mid-cut" (3 sentences, no avatars)
  4. 6-cell facts grid in place of the logo bar; it also replaces the features price board. Only facts that are true at ship time (Twilio/Telegram are still postponed)
  5. How it works: 3 zigzag rows (booking, alert and reminder cards) over photos
  6. Set up in one visit: the template's Founders layout with 2 cards
  7. Your first month: the template's timeline (Day 1 → Day 30, a pulsing "Today" dot), pill "Your first month"
  8. Pricing: "First month: Free" and "After the first month: one monthly price, no contract, cancel anytime, take your client list with you" + "Talk to us"
  9. FAQ, one open at a time
  10. Contact card holding our lead form + Turnstile; the Closing section is gone
  11. Footer: "Staff sign in" → `/login`; real `/privacy` and `/terms` pages (A2P 10DLC needs them; text written with the user later), no pop-ups
- Pill labels only in those two places.
- **Motion:**
  - Template scroll effects rebuilt: the panel widens, photos fade in, the nav shrinks, fade-ups.
  - React `<ViewTransition>` (`/vercel-react-view-transitions`) in 3 places only: the phone's screens, the language toggle, and moving between pages.
  - Reduced motion shows the final states.
- **Photos: CHOSEN 2026-11-11.** The user rejected the old-school CC0 set and sent their own Unsplash links (free photos, Unsplash License, not Unsplash+). The 5 picks are in `public/landing/photos/` as WebP, max 2400 px on the long side, serve via `next/image`:
  - How it works: `how-clipper.webp` (Salah Regouane, unsplash.com/photos/MRCdF3qUbp0), `how-trimmer.webp` (Firza Pratama, zRshOvj0K4o), `how-shop.webp` (Mitchell Orr, pL6-dYFSGWI)
  - Setup: `setup-street-pole.webp` (Arnaud Padalle, MgepwCgs3Xs)
  - Pricing: `pricing-red-chairs.webp` (JJ Shev, VrxWLZnCcBA)
  - Rejected: two photos whose subject is a face (one read as "our team").
  - Credits and the template's MIT notice go in `THIRD_PARTY_NOTICES.md`; no "Made by templatedeck" on the page.
- **Copy approved as written (2026-11-11)**, including claims that are **launch prerequisites** (the page must not go public before they're true):
  - Owner client export: backend only today; the button comes with U2.
  - Real (not test-mode) online payments.
  - The setup-visit promise "your link works the same day".
  - The morning Owner email needs a verified Resend domain.
  - Twilio texts and Telegram alerts live (How it works, the phone's "We'll text you a reminder").
- **Logo: CHOSEN 2026-11-11, option A "open scissors"**: two finger rings, tapered blades crossing at a red pivot. Source: `public/brand/mark.svg` (32×32; the light version for dark backgrounds). The build turns it into a `currentColor` React component plus the favicon and OG image. Wordmark: "Barber Master" in Geist semibold, tracking −0.02em.
- **404:** restyled `not-found.tsx`, EN/ES.
- **Pass criteria** (validator agent, production build, Lighthouse phone profile):
  - Performance ≥ 90, LCP < 2.5 s, CLS < 0.1
  - Zero axe violations, contrast ≥ 4.5:1 (incl. the red), visible focus, skip link, one h1 and a heading order that doesn't change with width, reduced motion respected
  - title, description, canonical, OG image, `metadataBase`, sitemap and robots, structured data (no fake reviews), `lang` matches EN/ES
  - No sideways scroll at 360/390/768/1280/1440 px in EN and ES
  - The lead form still saves, emails and passes Turnstile; landing e2e tests rewritten
  - No fake numbers, testimonials, logos or prices
- **Process:** milestones + a separate validator agent (Factory Missions style); `/impeccable init` first (writes `DESIGN.md`); small commits, each shown to the user first.

#### Build status (2026-11-11, end of session)

- **M1 Foundation + M2 Sections: DONE, committed** (`d496896` brand, `158c7ca` landing, `4c279e4` progress; not pushed yet).
  - Logo components in `src/components/brand/logo.tsx`, `src/app/icon.svg`, `src/app/opengraph-image.tsx`; all 11 sections in `src/app/_landing/`; tokens `--l-*` in `globals.css` (muted text oklch(64%), barber red oklch(62% 0.2 27), both lifted for contrast).
  - Direction contract: `.impeccable/surfaces/src-app-page-tsx.md`. Review screenshots (gitignored): `.impeccable/review/`.
  - Validator round fixed: the pulsing dot (now `live-dot.tsx`, transform/opacity only, runs only on screen), Turnstile loads only near the form, ES metadata via `generateMetadata`, `<html lang>` set before paint by `html-lang.tsx` (the root layout can't read the cookie under cacheComponents), "Skin fade" → "Desvanecido", pricing labels, select chevron, timeline dots and labels.
  - Checks: typecheck, lint (0 errors), build, landing e2e 7/7, impeccable detector `[]`, no sideways scroll, a11y 100.
  - **Performance not settled:** the worker measured 92/96/99, Claude measured 69/69 while a game was running (CPU at 65%). Re-measure on an idle PC in M4. If still < 90, look at the client JS (the lead form imports the whole EN+ES `landing.ts`; the hero phone).
- **M3 Motion: DONE 2026-11-12, committed.** All CSS on scroll timelines, inside `@supports (animation-timeline: view())` + `prefers-reduced-motion: no-preference`; everywhere else every element sits in its final state (no JS involved).
  - Wide panels: `WidePanel` (ui.tsx) now takes a `background` prop. The background is a full-width layer (`.landing-widen`) clipped to the 1152px column with 16px corners; on scroll the clip opens to the full window. The hero runs on `scroll(root)` over the first 50vh, setup and pricing on `view()`. Content layout never moves. The photos' `sizes` are now `100vw`.
  - How-it-works photos fade from 0.05 to their 0.45 (`[data-fade-bg] > img`).
  - Nav: 84px at the top, 69px after 80px of scroll; the header slides up 15px and the bar slides down 7.5px (no layout change), and a hairline fades in.
  - `[data-reveal]` blocks fade up over their first 180px in view. Removed from the hero (it's on screen at load anyway).
  - `<ViewTransition>` in 3 places: the phone screens (keyed by step, `phone-forward`/`phone-back` types, 10px slide + fade; only the current screen is rendered now), the language switch (`language-toggle.tsx` adds the `lang-switch` type; the landing and the phone cross-fade), and page moves (the landing's links to `/b/demo-shop`, `/login`, `/privacy`, `/terms` carry `transitionTypes={["page"]}`). The CSS is in globals.css; reduced motion sets every view transition to 0s.
  - Also: `data-scroll-behavior="smooth"` on `<html>` (Next warning), ESLint ignores `.claude/**` and `.impeccable/**` (vendored scripts; 98 warnings gone), and progress.md's markdownlint warnings were fixed.
  - QA agent (separate, didn't write the code): 9/10 criteria pass (reduced motion, 5 widths in EN/ES, nav, panels with 0px content shift, view transitions, axe 0 violations, code review, typecheck/lint/e2e). Fixed after QA: the phone's transition snapshots drew over the sticky nav (the header now has its own view-transition layer on top), focus moved to BODY after a phone step (now goes to the new screen's title), and the nav's 1px transparent border (now exactly 84 → 69). **Failed, pre-existing, moved to L4: with JS off the landing is blank** (the whole page streams inside `<Suspense>` because the locale comes from the cookie). The `page-in` transition only fires once a link into `/` carries `transitionTypes={["page"]}` (the legal pages' back link in L4).
  - Checks (Claude): typecheck, lint 0/0, build, landing e2e 7/7, impeccable detector `[]`, no sideways scroll at 390/1440, no reveal stuck partly hidden at 390/1440 with motion on or off, the 3 view transitions fire with their types and no console errors. Lighthouse (production build, idle PC at 14–20% CPU, phone profile): Performance 94/95/95, CLS 0, TBT 70–120 ms, a11y 100, best practices 100, SEO 91.
  - **LCP is 2.8–3.0 s (target < 2.5 s), the same as the M2 commit on the same PC (2.8–2.9 s), so M3 didn't cause it.** The LCP element is the hero paragraph; ~84% is "render delay". For M4: look at why the hero text paints late (the page streams inside `<Suspense>` because the locale comes from the cookie; the client JS).
  - Screenshots and scripts: `.impeccable/review/m3/` (gitignored).
- **M4 Ship-ready: DONE 2026-11-12, committed.** Built by 2 worker agents in parallel (A: `/es` + SEO + JS trim; B: legal pages, 404, notices), then a QA agent and the impeccable finish reviewer; their fixes applied.
  - `/` English and `/es` Spanish, both fully static (prerendered; work with JS off; metadata in `<head>`). `src/proxy.ts` sends `/` to `/es` (307, query kept) when the `lang` cookie is es, or with no cookie when Accept-Language prefers Spanish; `/?lang=en|es` saves the cookie and drops the parameter (the no-JS way to switch). The landing toggle sets the cookie and `router.push`es the clean URL in a `lang-switch` transition. Shared `Landing` component in `_landing/landing.tsx`.
  - SEO: `metadataBase` from `src/lib/site.ts` (`NEXT_PUBLIC_SITE_URL`, else Vercel's production URL, else localhost; **launch prerequisite: set it at build time**, the URLs are baked into static pages), canonical, hreflang en/es/x-default, OG images per locale (`og-card.tsx`), `sitemap.ts` (6 URLs + alternates), `robots.ts` (blocks /app, /api, /auth, /m/, /login), JSON-LD Organization/WebSite/WebPage (no ratings or prices). Lighthouse SEO 100, a11y 100, best practices 100.
  - Legal: `/privacy`, `/terms`, `/es/privacy`, `/es/terms` from `src/lib/i18n/legal.ts` (copy from the grill; `OPERATOR` and `CONTACT_EMAIL` are launch prerequisites), `_legal/legal-page.tsx`; bilingual `not-found.tsx`; `THIRD_PARTY_NOTICES.md` (Cocoon MIT, 5 Unsplash credits, Geist OFL).
  - Client JS: the lead form and nav get only their strings (no EN+ES dictionary in any chunk); Turnstile's code loads only near the form; Turnstile is dark and `interaction-only`; Send stays live and, pressed before the bot check finishes, waits and sends itself.
  - Finish-review fixes: the form above; the 404's two languages at equal weight with aligned buttons (both stay white: same action, two languages); pricing headers reserve 2 lines so the dividers line up. Demo special "until November 21" → "Weekday special" / "Oferta entre semana" (it would have gone stale).
  - QA: 22/22 e2e (landing + legal), axe 0 violations on all pages at 390/1440, no sideways scroll at 360–1440 EN/ES, redirects and JS-off all pass, view transitions all fire, no console errors.
  - **Accepted (Claude's call, 2026-11-12):** the raw server HTML of `/es/*` says `<html lang="en">`; the inline script sets `es` before paint, and every page root carries the right `lang`. The fix (a second root layout for `/es`) would turn every language switch into a full page load. Revisit only if a crawler or screen reader shows a real problem.
  - **Deploy note:** `/` is cached as static but redirected by the proxy per cookie/language. Correct on Vercel (the proxy runs before the cache); a URL-only CDN in front would serve English to everyone.
  - **Lighthouse on an idle PC (CPU 2–10%), production build, phone profile, 2026-11-12:** `/` 95/95/95, `/es` 94/95/94, `/privacy` 98; CLS 0; TBT 60–150 ms; accessibility, best practices and SEO 100 everywhere. (Under a game's load the day before, the landing fell to 54–66: the GPU process starves while drawing the full-width photos and the blurred header in software.)
  - **Accepted: simulated LCP 2.9 s (target < 2.5 s).** The observed LCP is 0.46 s. Lighthouse's simulation charges every file requested before that paint, mostly Next's framework scripts (~140 KB); the near-empty `/privacy` already simulates 2.4 s, so 2.5 s is roughly the framework floor. Not worth cutting the design for; check real-user LCP after launch (Vercel Speed Insights).
  - `DESIGN.md` + `.impeccable/design.json` written by the documenter from the shipped code ("The Shop After Hours": gray-only dark, one barber red for live signals, Geist; named rules such as Live Signal, Still Layout, Final State). The app's "Operate" mode is marked as future (G). Small drift it recorded, to fix when convenient: the hero phone hard-codes its paper and red colors instead of tokens; `logo.tsx`'s fallback red `#d0312d` differs from `--l-red`; CLAUDE.md's "Landing page" paragraph still describes the old navy theme (Big Shoulders / Instrument Sans / WebGL gradient).
  - Pushed to GitHub after the user's OK (2026-11-12). `CLAUDE.md` (untracked) updated for the current landing.
- **(Old M4 plan, kept for reference.)** Includes fixing the LCP (above) and the JS-off blank page. Found 2026-11-12:
  - The *observed* LCP is 0.5 s; Lighthouse's 2.8 s is its throttled simulation, which counts the landing's client JS. `/login` (same framework) gets 0.8 s, so trim the landing's JS: `lead-form.tsx` and `hero-phone.tsx` import the whole EN+ES `landing.ts` (~49 KB chunk); pass only the current locale's strings as props. The Turnstile code (~22 KB) is in the first load; load it with the form.
  - SEO 91 = the meta description is missing from `<head>`: `generateMetadata` reads the cookie, so Next streams it into `<body>` (by design; Googlebot reads it, Lighthouse doesn't). Proposed fix (ask the user): a real `/es` URL for the Spanish landing, so both versions are static (metadata in `<head>`, hreflang, prerendered, works with JS off), with `/` redirecting Spanish visitors by cookie / Accept-Language.
  - The `/privacy` and `/terms` copy (EN+ES) is drafted from the grill answers; it becomes `src/lib/i18n/legal.ts`. `/privacy` + `/terms` placeholders (EN/ES), restyled `not-found.tsx`, SEO (`metadataBase`, canonical, sitemap, robots, structured data; also fix the meta description/title landing in `<body>` with `generateMetadata`, Lighthouse SEO 91), `THIRD_PARTY_NOTICES.md` (photo credits + Cocoon MIT), e2e review, full validator run against the pass criteria on an idle PC, then the impeccable finish reviewer and the documenter (`DESIGN.md`).
- **Open with the user:** the impeccable skill bans pill labels above headings; the user chose two (Q23). Kept; the finish review may flag them.

### Landing page for Shop Owners, v2 navy (2026-11-10; REPLACED by v3, kept for history)

Plan: `C:\Users\admin\.claude\plans\we-can-set-up-breezy-starlight.md`. The user asked (2026-11-10) to run it as a "mission" with the Factory Missions framework (<https://docs.factory.com/missions/overview.md>): goal → milestones with pass criteria → one worker agent per feature → a separate validator agent that didn't write the code, failures go back to a worker. **Keep using it for what's left.** The milestones are below.

**Decisions:** audience = barbershop Owners in the Bronx and upper Manhattan; contact = a short form in the app (leads saved + emailed to Platform admins); price = only "first month free", no price shown; language = phone's language with the Español/English toggle; no fake testimonials or numbers. Look inspired by simeon.sh (adapted, not copied): always-dark charcoal page, Geist headlines with tight tracking, Geist Mono body, small pill section labels, grainy "glow frames" lit in barber-pole red/white/blue, floating tilted mini UI cards.

**M1 Site sections — DONE, validated (round 2: 7/7 criteria pass).** `/` = Nav (with a sections menu below 1024px), Hero, Problem (appointment-book "ledger page"), How it works (3 steps), Features (interactive list on desktop, plain text on phones), Setup (one visit), Offer + lead form (`#free-month`), FAQ, Closing, Gallery (`#styles`), Footer. Checked at 360/390/768/1280 in EN and ES: no sideways scroll, every section opens with a label + h2, even spacing, nav anchors land below the bar, visible keyboard focus everywhere, text contrast ≥ 6.3:1. Fixed after round 1: invisible focus on the FAQ and form fields (Tailwind v4 `outline-none` cancels `outline-2`; shared `focusRing` adds `outline-solid`), uneven Closing section, the same mini card repeated in 5 places, hero text indent, a 2,500px Features stack on phones (page ~1,500px shorter now), and the light body color showing under the dark page (`html:has(.landing)` rule in globals.css).

**M2 Leads reach a human — DONE.** The user's login is now a Platform admin in dev (`platform_admins`). A lead sent from the page was saved and the "New lead: …" email arrived in Gmail via Resend 15 s later. A test lead named "M2 Check Barbershop" is still in `public.leads` (the delete was declined; harmless). Leads that can't be emailed stay pending and `/api/cron/daily` retries them.

**Update 2026-11-10 (later): M3 DROPPED, page redesigned. This replaces the M3 notes below (kept for history only).**

- The user stopped the 3D heads after ~2 hours of trouble. The page is redesigned around a WebGL gradient the user supplied: `src/components/ui/animated-gradient.tsx`, hardened so it pauses off-screen or in a hidden tab, draws a still frame under reduced motion and renders at 1x resolution at most.
- Removed: `gallery.tsx`, `head-viewer.tsx`, `heads.ts`, the gallery strings and every "Styles" link.
- Still on disk, unused: `scripts/head-frames.mjs`, `heads_reference_images/`, `public/landing/heads/` (test frames, untracked), `C:\Users\admin\tools\head3d\`. Delete them if the 3D idea is dead for good.
- The look:
  - Hero = a "melting barber pole" (`POLE_GRADIENT` in `hero.tsx`: pole blue, red and cream stripes); the same gradient comes back in the Closing band.
  - Navy palette (`--l-*` in `globals.css`).
  - Big Shoulders headlines and Instrument Sans body, loaded in `page.tsx` and scoped to `.landing`. Mono is left only inside the UI mockups.
  - The nav is a floating glass pill.
- Motion:
  - One load sequence: the headline words rise.
  - After that, only scroll-driven CSS (`animation-timeline`, behind `@supports` and reduced motion): the hero recedes, the alert cards slide, the problem quotes get struck through, the how-it-works line fills.
  - Buttons carry a mini pole that turns on hover.
  - Firefox has no scroll-driven animations yet, so it shows the final states (quotes already struck). This is on purpose.
- Checked at 1440×900 and 390×844 in EN and ES: no sideways scroll. Typecheck, lint, `npm run build` and the 5 landing e2e tests pass.
- Build warning "Failed to find font override values for Big Shoulders": it only means there's no size-matched fallback font. Harmless.
- 2026-11-11, borrowed from the user's reference site (localhost:4173, "How a lesson works"):
  - **How it works is now a pinned stepper** (`how-stepper.tsx`):
    - three tall steps; the one nearest the middle of the screen is lit, the others dim to 28%;
    - the rail fills down to the middle of the screen (`--hp`, set by a scroll handler);
    - a sticky window on the right swaps scenes (booking / alert / reminder) whose rows pop in staggered (`.bm-scene`, `.bm-pop`).
    - Below 1024px: plain steps, no rail, no window. Scene text is in `howStage` in `landing.ts`.
  - **Cards** (`.bm-card` in globals.css, components layer): inset key border; on hover the card lifts 4px, a light line runs along its top edge, and the `.bm-icon` circle turns cream. Used on the 4 hero values (line icons), the setup steps (2×2) and the offer points.
  - **Staggered fade-up on scroll** (`.bm-reveal`, added by `reveal.tsx`): hidden only when scripts run and motion is allowed.
  - The old CSS-only rail fill (`bm-fill`) is gone.
- 2026-11-11, **interactive hero phone** (`hero-phone.tsx`):
  - The screenshot is replaced by a working pretend booking in the real page's look: service → barber → time → "You're booked". Screens slide; taken times are disabled; nothing is saved.
  - Booking updates the floating "New booking" alert beside the phone to what was just booked, with a small pop (`.bm-ping`).
  - With a mouse, the phone leans toward the pointer (off with reduced motion).
  - Text is in `heroPhone` in `landing.ts`, EN/ES.
  - New e2e test in `tests/e2e/landing.spec.ts` (6 landing tests now).
  - The hero's scroll fade (`.bm-lift`) now runs only at ≥1024px, because on phones the phone sits below the fold and was turning see-through.
- 2026-11-11, **cleanup round** (user's list; done with /frontend-design and the project-only `/impeccable` skill in `.claude/skills/impeccable`, installed with `--no-hooks`, no PRODUCT.md yet: offer `/impeccable init`):
  - **Nav** (`nav.tsx`, now a client component): a fixed glass bar like the reference site. Past 24px of scroll it eases narrower (1120→920px), shorter and darker. A hairline along its bottom fills with page progress (`--page`, `.bm-nav::after`), a soft highlight slides behind the link of the section in view, and the bar drops in once on load.
  - **Hero**: no section label, no floating cards around the phone, no ticker row, no 4 value cards. A bigger phone, a "Try it" pill, and a bottom strip of three facts (`heroFacts`). The phone's "any barber" star glyph is now an SVG.
  - **Problem section ("The counter today") removed**: `problem.tsx` was deleted along with the `.bm-strike` and `.bm-slide` CSS. The page goes Hero → How it works.
  - **Every pill label above headings removed** (`SectionLabel` is gone), along with the unused strings (`*Label`, `heroTrust`, `problem*`, `values`).
  - **Features = a price board** (`features-list.tsx`): each name is set in Big Shoulders with a dotted leader and "Included" (`featuresPrice`) where the price would be. The selected line opens its detail (grid-rows) and the framed visual blurs over to it. Hover selects with a mouse; tap selects on phones, where the visual sits under the list. The mockups no longer use mono.
  - **FAQ**: `details name="faq"` keeps one question open at a time (the first starts open). The answer unfolds to its height (`::details-content` + `interpolate-size`) and sharpens out of a blur, and the + turns into a × in a cream circle. Reduced motion keeps only fades. Browsers without `::details-content` just open instantly.
  - Checks: typecheck, lint, `npm run build` and 7 landing e2e tests pass (a new one covers "questions open one at a time"; the phone test no longer checks the removed alert card). The impeccable detector is clean after fixing one finding (thick accent border on the rounded tickets). Screenshots are at 1440×900 and 390×844 in EN and ES.
- **Committed and pushed 2026-11-11.** The impeccable skill is committed under `.claude/` without its engine binary (gitignored; the launcher downloads it). `public/landing/heads/` is gitignored now that the 3D gallery is gone.

**M3 360° head gallery — viewer DONE, real heads WAITING.** (superseded, see above)

- Viewer (`head-viewer.tsx`): canvas image-sequence turntable (72 frames, 5° steps), every frame fetched and decoded to ImageBitmap before dragging, drawn only when the frame changes; mouse/touch/pen drag with momentum, `touch-action: pan-y` so phones still scroll, arrow keys (role=slider), reduced motion respected, lazy loading near the viewport, head picker. Measured: p95 16.7 ms per frame while dragging, also with the CPU slowed 4×.
- Frames go in `public/landing/heads/<id>/{720,1440}/NN.webp`; `heads.ts` lists the heads and shows only those whose frames exist. A generated grey **test head** shows until then (must not ship; it hides itself once a real head exists).
- Reference photos: `heads_reference_images/` (6 single heads `01`–`06` + 2 grids, committed). Each photo shows one side only, so the user chose (2026-11-10) **local AI image-to-3D on this PC's RTX 4060** (images never leave the PC; **no Higgsfield**; the user approved downloading an open-source model of several GB), render a 72-frame turntable per head, then `node scripts/head-frames.mjs folder <frames> --id <id>`. Tools go in `C:\Users\admin\tools\head3d\` (outside the repo, own venv).
- The 6 head ids (= folder names under `public/landing/heads/`) and EN/ES names are already in `heads.ts`: `curly-taper-fade`, `textured-crop-fade`, `comb-over-hard-part`, `curly-high-fade`, `textured-fade-design-lines`, `slick-back-drop-fade` (from `heads_reference_images/01`…`06`).
- Test head: only in development and only while no real head exists (`gallery.tsx`); its frames are gitignored, regenerate with `node scripts/head-frames.mjs test`. **In production with no real heads the gallery renders nothing, so the nav/footer/closing "Styles" links point at a missing `#styles`** — fine until deploy, but don't ship without at least one head (or hide those links).
- Screen-reader strings added (`galleryLoading`, `galleryPicker`, `galleryKeys`); the 6-button picker wraps to 2 columns at 360px (checked with injected markup, not with real heads yet).

**M3 — NOT DONE, start here next session:**

1. **Check the 3D worker's state.** At the end of the 2026-11-10 session a worker agent was setting up the model in `C:\Users\admin\tools\head3d\` and converting `01-curly-taper-fade` (its log: `C:\Users\admin\tools\head3d\LOG.md`; outputs `out\<id>.glb`, frames, a `run.py`/`run.ps1` pipeline script). It hadn't reported when the session ended, so verify what exists: venv, model weights, GLB, and whether `public/landing/heads/curly-taper-fade/{720,1440}/00..71.webp` exist (those frames were deliberately NOT committed).
2. Brief for that work: remove the gray background; image → textured GLB (prefer Hunyuan3D-2mini if its texture stage fits 8 GB VRAM and builds on Windows; TripoSR as fallback; avoid gated Hugging Face models); render 72 frames orbiting the vertical axis in 5° steps, frame 00 = the photo's angle, transparent background, 1440×1440, same turning direction as the test sequence; convert with `node scripts/head-frames.mjs folder <dir> --id <id>`.
3. **Show the user ONE head first** (contact sheet every 30° + photo vs frame 00) and wait for their OK before making the other five.
4. Then a **validator agent** checks M3: p95 ≤ 17 ms per frame while dragging, sharp at 2× DPR, touch + reduced motion, no layout shift, bytes per head (real frames are expected 2–4× the test head's 0.5 MB / 1.5 MB).
5. Commit the frames (check total size first; WebP only, never the PNG renders or GLBs).

**M4 Ship-ready — done for everything except the heads.** Verified 2026-11-10: `npm test` 143 passed (11 files), `npm run e2e` 9 passed, typecheck and lint clean, `npm run build` clean (Next 16 dev writes to `.next/dev`, so build and dev can run at the same time). Committed and pushed 2026-11-10.

**Leftovers (polish, no rush):**

- Build warns that `metadataBase` isn't set (Open Graph image URLs fall back to localhost): set it at deploy (U5) once the domain exists.
- Turnstile leaves an empty 65 px slot in dev; check with the real widget.
- The gallery sits last, as the user asked; the validator noted most visitors pass the form before reaching it.
- On phones the hero's reminder card covers the bottom of the screenshot a little.
- On desktop the feature titles are `<span>`s inside buttons, on phones `<h3>`s (heading outline differs by width).
- The validator agents' screenshots and the mission file were in the session scratchpad and are gone; the pass criteria are summarized above.

### Done on 2026-11-10

- **Demo shop connected to Stripe.** The user finished Stripe's onboarding (test data, bank ••••6789, automatic payouts, Radar Lite, no Climate, no Stripe Tax). About 50 seconds later Stripe finished verifying, `account.updated` arrived and `payments_enabled` turned on by itself.
- **Real payment test passed** (headless browser on `/b/demo-shop`, card `4242…`):
  - Pay now by card → Stripe Checkout → back on `/m/<token>?paid=1` showing "Confirmed · $30 · Paid online"; the Booking has its payment reference and a Barber alert was queued.
  - Cancelled from the manage page → `refund_requested` done → Stripe shows refund `re_3UaLEt…` **$30, succeeded**.
  - 5 abandoned checkouts: the worker released all 5 holds after 10 minutes (`cancelled_by = system`) and Stripe shows those sessions **expired, unpaid**.
- **Why sign-in failed today:** the magic link is a PKCE link and only works in the browser where it was requested (the user asked in one browser and opened it in another, which had an old secret: "code challenge does not match"). The code is fine (tested: each request saves a fresh secret). Permanent fix = the Magic Link email template change under "Needs you" item 1.
- **Findings to handle later:**
  - Stripe Checkout offers Cash App, Klarna and Crypto as well as cards, because `src/server/providers/stripe.ts` doesn't set `payment_method_types`. Slow methods can confirm after the 10-minute hold and then get refunded automatically. **Decision needed:** cards only (cards, Apple Pay, Google Pay)?
  - With 2 held online Bookings, the form says "You already have 2 upcoming bookings to pay at the shop", which is wrong for card payers. Fix the wording in U1.
  - Demo Barbers' logins are `@example.com`, which Resend refuses, so their alert emails retry and end in the failures log. Dev data only.
  - The worker uses the server's clock and the database marks rows due by its own clock; this PC's clock is a few seconds behind, so a just-queued row can wait until the next run. Harmless.
  - Supabase's built-in sender hit its hourly limit after a handful of sign-in emails.
- Test data left in the dev DB: Client "Payment Test" with 6 cancelled Bookings (history, harmless).

Verified on 2026-11-09 (evening, after the no-show rule): `npm test` 138 passed (10 files), `npm run e2e` 4 passed, typecheck and lint clean.

Verified on 2026-11-09 (evening, after the provider setup): `npm test` 135 passed (10 files), `npm run e2e` 4 passed, typecheck and lint clean; a test run now leaves no test logins behind. A real signed Stripe test event went Stripe → `npm run stripe:listen` → `/api/payments/webhook` and was answered 200.

### Needs you (as of 2026-11-10)

1. **Decide:** limit Stripe Checkout to cards (see "Findings" under 2026-11-10)?
2. **Twilio and Telegram keys** (postponed by agreement on 2026-11-10). All five are empty in `.env.local`, so texts and Barber alerts go to the server log for now.
3. **Landing page:** judge the first 3D head before the other five are made; approve the commits.

Login emails are **done** (2026-11-10): Supabase sends them through Resend SMTP (`Barber Master <onboarding@resend.dev>`, limit 100/hour), with the Magic Link template `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/app/day`. Tested: the email arrived in Gmail and its link signed in a browser that never requested it. Until a domain is verified in Resend, these emails only reach the Resend account's own address (`samirflores13@gmail.com`), so other staff can't sign in by email yet.

### Done on 2026-11-09 (evening)

- **B2 payments finished** (details under B2 below) and pushed.
- **Keys:** `RESEND_API_KEY`, `STRIPE_SECRET_KEY` (test) and `STRIPE_WEBHOOK_SECRET` are set in `.env.local`. The first Stripe key pasted was a **live** key (`sk_live_`); it is commented out in `.env.local` and was never used. Only `sk_test_` keys go in while testing.
- **Stripe Connect** turned on in test mode with: sellers collect payments directly (direct charges), onboarding hosted by Stripe, and sellers manage their account in the full **Stripe Dashboard**. The app therefore creates **Standard** accounts (was Express), so an Owner can also refund by hand there.
- **Stripe CLI inside the project:** `tools/stripe/stripe.exe` (v1.55.8, checksum verified; gitignored, nothing installed globally), login saved in `.stripe/` (gitignored). `npm run stripe -- <args>` runs it; `npm run stripe:listen` forwards the 3 events the app uses (`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `account.updated`) to `localhost:3000/api/payments/webhook`. This CLI version requires the event list.
- **Demo shop:** has a Standard test account `acct_1UZztIKigFGnpZ4J`; its setup isn't finished yet (item 1 above).
- **Fixed: every page reloaded about 10 times a second in dev.** Cause: the dev build cache (`.next`) got out of sync after the dev server was force-stopped several times, so each reconnect got "HMR hash mismatch, reload". Fix: stop the server, delete `.next`, start again. Do the same if it ever comes back.
- **Console error "attributes didn't match" on `<body>`:** a browser extension adds `location="localhost"` to `<body>`. Added `suppressHydrationWarning` to `<body>` only (`src/app/layout.tsx`); mismatches inside pages still show. It couldn't be reproduced in a headless browser, so confirm in your browser.
- **Payments review fix:** a paid event whose checkout id didn't match the one saved on the Booking was ignored, which would have kept the money with no booking and no refund. Now every paid event for an existing Booking confirms it or refunds it in full (test added).
- **No-show rule (decided 2026-11-09, "keep it easy, no stress for me or the clients"):** a phone with **2 no-shows in the last 90 days pays online to book** at Shops that take online payments. Nobody is blocked, nobody has to manage it, and it clears itself as the no-shows age past 90 days. At a Shop without online payments nothing changes. The booking form explains it kindly and switches the client to "Pay online" for them (`PAY_ONLINE_REQUIRED`). The client export has a new `no_shows` column. Settings: `RULES.noShowLimit` and `RULES.noShowWindowDays`. Tests in `tests/engine/payments.test.ts`.
- **Test cleanup:** tests that removed a Barber left that login behind (39 had piled up). The fixtures now delete every login they made for a Shop, and the 39 orphans were deleted (none belonged to a Shop, a Barber or a Platform admin).

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
| --- | --- |
| Database | `supabase/migrations/*` (schema, RLS, split policies), `supabase/seed.sql` (demo shop "Fresh Cuts Barbershop": Carlos, Dre, Maya; 5 Services) |
| Booking engine | `src/server/booking-engine/` (`index.ts` operations, `availability.ts` slot math, `time.ts`, `errors.ts`), `src/server/db.ts`, `src/server/engine.ts` |
| Public booking | `src/app/b/[shopSlug]/`, `src/app/api/availability/route.ts`, `src/components/slot-picker.tsx`, `turnstile.tsx` |
| Manage booking | `src/app/m/[token]/` (cancel / change time, cutoff rule) |
| Login | `src/app/login/`, `src/app/auth/callback`, `src/app/auth/signout`, `src/lib/supabase/`, `src/proxy.ts` |
| Barber day view | `src/app/app/day/` (arrived / no-show, walk-in, cancel; Owner can switch Barbers) |
| Sending worker | `src/server/dispatch/` (outbox worker), `src/server/senders.ts` (wires real providers or log-only stand-ins), `src/app/api/cron/dispatch`, `src/app/api/cron/daily`, `src/server/cron-auth.ts` |
| Payments (B2) | `src/server/payments/` (provider-neutral), `src/server/providers/stripe.ts`, `src/app/api/payments/{webhook,onboard,return}` |
| Texts (B3) | `src/server/texting/` (templates, daily cap, STOP), `src/server/providers/twilio.ts`, `src/app/api/twilio/inbound` |
| Alerts (B4) | `src/server/alerts/` (Telegram, email fallback, daily Owner email), `src/server/providers/{telegram,resend}.ts`, `src/app/api/telegram/webhook` |
| Owner tools (B5) | `src/server/shop-admin/`, `src/server/reporting/`, `src/server/invites.ts` |
| Platform admin (B6) | `src/server/platform-admin/`, `src/server/logins.ts`, `src/lib/csv.ts` |
| Landing page | `src/app/page.tsx` (EN) and `src/app/es/page.tsx` (ES) render `src/app/_landing/landing.tsx`; one file per section in `src/app/_landing/` (`ui.tsx` shared pieces and `WidePanel`, `nav.tsx` with the landing's language link, `hero-phone.tsx` the live demo phone, `live-dot.tsx`, `html-lang.tsx`, `og-card.tsx`); `src/lib/i18n/landing.ts` (all EN/ES copy), `src/app/lead-form.tsx`, `src/app/actions.ts`, `public/landing/photos/` (5 Unsplash WebPs), `src/components/brand/logo.tsx`, `src/app/icon.svg`, `src/app/opengraph-image.tsx` + `src/app/es/opengraph-image.tsx`. Design system: `DESIGN.md`, `.impeccable/design.json`, direction contract `.impeccable/surfaces/src-app-page-tsx.md` |
| Legal + SEO | `src/lib/i18n/legal.ts` (privacy/terms copy EN/ES; `OPERATOR`, `CONTACT_EMAIL` are launch placeholders), `src/app/_legal/legal-page.tsx`, `src/app/{privacy,terms}/`, `src/app/es/{privacy,terms}/`, `src/app/not-found.tsx` (bilingual), `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/site.ts` (`SITE_URL`), `THIRD_PARTY_NOTICES.md` |
| Leads | `supabase/migrations/20261111090000_leads.sql`, `src/server/leads/` (save, 24h repeat guard, email Platform admins, retry from the daily job), `leads()` in `src/server/senders.ts` |
| Scripts | `scripts/landing-shots.mjs` (`npm run landing:shots`, booking screenshots for the landing), `scripts/add-staff.mjs` (`npm run staff:add`), `scripts/telegram-webhook.mjs` (`npm run telegram:webhook`), `scripts/stripe.mjs` (`npm run stripe`, `npm run stripe:listen`; the CLI itself is in `tools/stripe/`, gitignored) |
| Tests | `tests/unit/` (availability, Twilio and Stripe signatures), `tests/engine/` (booking engine, dispatcher, texting, alerts, payments, shop admin, platform admin, leads; real database), `tests/e2e/` (race, Book now, landing 12, legal 10). |

## Known issues to fix later

- ~~"Book now" did nothing~~ **Fixed 2026-11-09.** Cause: pressing it before the bot check had issued its token got a "complete the security check" error, rendered at the top of the page, off-screen on a scrolled form. Now the button waits for the bot check ("Checking you're not a robot…") and errors show beside it and scroll into view. Regression test: `tests/e2e/book-now.spec.ts` (Pixel 7, 1280x800, 360x560).
- Found and fixed while building B1: outbox payloads were stored as JSON strings instead of objects (migration `20261109181000_outbox_payload_objects.sql` repaired old rows).
- Scheduler for go-live: Vercel cron on the free (Hobby) plan runs at most once a day; the worker needs every minute. Options at deploy time (U5): Vercel Pro, or Supabase `pg_cron` + `pg_net` calling `/api/cron/dispatch`.
- Supabase's built-in email sender is rate-limited; login emails will move to Resend (see "Needs you").
- If the dev site starts reloading in a loop ("HMR hash mismatch"): stop `npm run dev`, delete `.next`, start again.
- `/login` always says "link sent", even for an email without a staff login (on purpose, so it doesn't reveal who has an account). If no email arrives, check the login exists (`npm run staff:add`).

## Decisions for B2 (payments), from 2026-11-07

1. **Hold while paying online: 10 minutes.** An online Booking is saved as "awaiting payment" and blocks the time for 10 minutes. If payment does not arrive in time, the hold is released and the checkout is expired. If a payment still arrives after the release, it is refunded automatically. (Stripe Checkout sessions can't be set to expire in under 30 minutes, so we expire the session ourselves when the hold ends.)
2. **Rescheduling keeps the original payment**, only for Bookings paid online upfront.
3. **Stripe is for testing only.** We will switch to a different payment provider later, so the Payments module goes behind a provider-neutral interface (an adapter). Only the adapter knows Stripe.
4. **Refunds are always in full** (the whole price goes back to the Client; processing fees are not deducted from the Client).

## Accounts to create (needs you; I can't sign up on your behalf)

| Service | Used for | What to get | Status |
| --- | --- | --- | --- |
| Resend (resend.com) | Login emails, Barber email alerts, daily Owner email | API key; later a verified sending domain | **Key set** 2026-11-09; no email sent through it yet; login emails not moved yet |
| Stripe (dashboard.stripe.com), **test mode** | Online payments while testing (Connect enabled) | Secret test key `sk_test_...`; webhook secret via Stripe CLI | **Done** 2026-11-09: test key and CLI webhook secret set, Connect on |
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

### B2: Payments (Stripe test mode, provider-neutral) — DONE 2026-11-09 (keys set; waiting on the demo shop's Stripe setup to test a real payment)

**What was built:**

- Migration `20261110110000_payments.sql`: `shops.payment_account_id` (renamed) and `payments_enabled`; booking status `pending_payment` with `hold_expires_at`, `checkout_ref`, `payment_ref`; `cancelled_by = 'system'`; `payment_events` (server-only); outbox type `refund_failed`.
- `src/server/payments/index.ts`: the provider-neutral module (`startOnboarding`, `finishOnboarding`, `startCheckout`, `handleWebhook`, `releaseExpiredHolds`, `refund`) behind the `PaymentProvider` port. `src/server/providers/stripe.ts` is the only file that knows Stripe (fetch, no SDK; Connect **Standard** accounts with direct charges; signature check with 5-minute tolerance).
- Engine: an online Booking is created as `pending_payment` for 10 minutes and nobody is told; the paid webhook confirms it and sends the alert, text and reminder. A payment after the hold ran out is refunded in full. Held Bookings count toward the unpaid limit, block the time, can't be marked arrived, and aren't in the stats.
- Dispatcher: a refund that keeps failing writes a `refund_failed` row; the Owners get an email to refund by hand.
- Routes: `POST /api/payments/webhook`, `GET /api/payments/onboard?shop=<id>` (Owner), `GET /api/payments/return`. `/api/cron/dispatch` releases expired holds first.
- UI: online payers go straight to checkout; the manage page shows "Waiting for payment" with a **Pay now** button and a thank-you after paying.

**To try it (test mode):**

1. Stripe dashboard in test mode: turn on Connect (done: direct payments, Stripe-hosted onboarding, Stripe Dashboard). Copy the test secret key (`sk_test_...`) into `STRIPE_SECRET_KEY` (done).
2. The Stripe CLI lives in the project (`tools/stripe/`, gitignored; get it from github.com/stripe/stripe-cli/releases). Run `npm run stripe -- login` once, then `npm run stripe:listen`; put the `whsec_...` it prints in `STRIPE_WEBHOOK_SECRET`. Restart `npm run dev`.
3. As an Owner, open `/api/payments/onboard?shop=<shop id>` and finish Stripe's test onboarding (use its test data).
4. Book with "pay online", pay with card `4242 4242 4242 4242`; the manage page should turn to Confirmed after a refresh.
5. Production: create a webhook endpoint in the dashboard with **Events from: Connected accounts**, the 3 events above, URL `https://<deployed address>/api/payments/webhook`. Its signing secret is different from the CLI's.

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
  - `createTelegramLink` (single-use, 24 hours; a Barber for themselves, the Owner for anyone in the Shop), `unlinkTelegram`, `handleTelegramUpdate` (`/start <token>`).
  - `sendDailySummaries`: yesterday's online bookings, walk-ins, no-shows and minutes saved to each Shop's Owners, from 7:00 Shop time, once per day. A failing Shop is retried next run and doesn't stop the others.
- **Telegram adapter** + **`POST /api/telegram/webhook`** (checks `TELEGRAM_WEBHOOK_SECRET`, always answers 200). `npm run telegram:webhook -- https://public-address` registers it and prints the bot's username.
- **Resend adapter** (fetch). Without a verified domain, Resend only delivers to the account's own email.
- **`/api/cron/daily`** now sends the daily email and runs the 30-day deletion (independently). Schedule it at 11:00 and 12:00 UTC so 7:00 New York works in summer and winter.
- **Day view:** a small "Get booking alerts on Telegram" button (link only; the QR code comes with the UI phase). `telegramUnlinkAction` exists for the UI.
- **Wiring** (`src/server/senders.ts`): each provider is used only when its keys are set; otherwise it prints to the server log.
- **Migration** `20261110090000_messaging.sql`: `bookings.locale`, `shops.sms_from_number`, `shops.daily_email_last_date`, `sms_log`, `barber_telegram` (server-only tables).
- **Tests:** `tests/engine/alerts.test.ts` (6), plus dispatcher tests for "hold until" and "Booking deleted".
- **Still to do (needs you):** move Supabase login emails to Resend SMTP. Supabase dashboard > project `barber-booking-dev` > Authentication > Emails > SMTP Settings > turn on **Enable custom SMTP**:

  | Field | Value |
  | --- | --- |
  | Sender email | `onboarding@resend.dev` for now (only delivers to the Resend account's own email); later an address on your verified domain, e.g. `login@yourdomain.com` |
  | Sender name | `Barber Master` |
  | Host | `smtp.resend.com` |
  | Port number | `465` |
  | Minimum interval per user | `60` seconds (default) |
  | Username | `resend` |
  | Password | your Resend API key (`RESEND_API_KEY` in `.env.local`, starts with `re_`) |

  Then Authentication > Rate Limits: raise "emails sent per hour" (custom SMTP starts at 30). Alerts are English only for now.

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
| --- | --- | --- |
| 1 | Rescheduling keeps the original payment | **Decided:** yes, when paid online upfront |
| 2 | "Any available Barber" rule | **Decided:** fewest Bookings that day |
| 3 | Cutoff longer than 2h makes the reminder arrive after the cutoff | Plan: warn the Owner when saving (B5) |
| 4 | Texts while SMS registration is pending | **Decided:** go live, show the link on screen |
| 5 | Stripe fee, negative balance and dispute rules | Not needed now: Stripe is test-only; refunds are in full |
| 6 | Sole-proprietor texting limits (Shops without an EIN) | **Researched** (see below): sole proprietor is enough for a pilot Shop; add a daily cap guard in B1 |
| 7 | Product name and booking link format | **Decided:** the product is **Barber Master** (app title renamed 2026-11-07). Link stays `/b/<shop-slug>` |
| 8 | Which payment provider replaces Stripe | **Researched** (see below): leaning Square or Stripe for cards, PayPal/Venmo as an optional extra; Zelle can't be automated. Final pick in the B2 grilling |
| 9 | "Book now" button | **Fixed 2026-11-09** (the button now waits for the bot check, and errors scroll into view) |
| 10 | No-shows | **Decided 2026-11-09:** 2 no-shows in 90 days → that phone pays online to book (only at Shops with online payments); clears itself; `no_shows` column in the client export. Barbers still mark no-shows in the day view. |

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
| --- | --- | --- | --- |
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

## Next steps (start here next session)

**First thing next session (Claude does this before anything else):** start the app and the Stripe listener, both in the background, then check them:

1. `npm run dev` (the app, <http://localhost:3000>)
2. `npm run stripe:listen` (forwards Stripe test events to the app; payments don't reach the app without it)
3. Check: `/login` loads and doesn't reload in a loop, and the listener prints "Ready!". Its webhook secret must still match `STRIPE_WEBHOOK_SECRET` in `.env.local`. It stays the same until the Stripe CLI login expires, about 90 days after 2026-11-09; then run `npm run stripe -- login` and update the secret.

Both were stopped at the end of the 2026-11-09 session on purpose. If pages reload in a loop, stop `npm run dev`, delete `.next`, start again.

**Checks to do first (quick):**

- [ ] In Brave's console on any page, the `<body>` "attributes didn't match" error should be gone (it couldn't be checked headless).

**Real-service tests (in this order):**

1. ~~**Stripe payment.**~~ **Done 2026-11-10** (pay, confirm, cancel, full refund, hold release; see "Done on 2026-11-10").
2. ~~**Resend.**~~ **Done 2026-11-10** (login email through Resend; any-browser link).
3. **Twilio and Telegram.** Create the accounts, put the 5 keys in `.env.local`, restart. Their webhooks need a public address (a tunnel now, or the deploy). Then test a confirmation text, STOP, and linking a Barber's Telegram.

**Then:**

- **Follow the Mission plan at the top, starting at "U2 status → Milestones left".** L1–L4, G, U1, U3a are done; U2 is partly done. Keep agent jobs small (user's rule, 2026-11-13): use the project agents `bm-worker` (builder, one job) and `bm-qa` (inspector, Sonnet), defined in `.claude/agents/`, so briefs only carry the task and the file list.

**Left for the deploy (U5):**

- Every-minute scheduler for `/api/cron/dispatch` (Vercel Pro, or Supabase `pg_cron` + `pg_net`); `/api/cron/daily` at 11:00 and 12:00 UTC.
- Production Stripe webhook (Events from: Connected accounts; see B2 step 5), production Turnstile keys, a verified Resend domain, Sentry.
- Choose the payment provider that replaces Stripe (Square or Stripe; see the research notes).

**Small open items (no rush):**

- Confirm: a no-show still counts as an online Booking and as time saved in the numbers (B5 "Open after review").
- Photo uploads for Barber profiles (U3); `inviteBarber` has no automated test; alerts are English only.

## Git

- Local repo on branch `main`. Pushed up to 2026-11-12 (landing v3 through L4 and DESIGN.md). `CLAUDE.md` is untracked on purpose.
- Remote already added: `origin` → `https://github.com/OmarflorexAI/Barber-booking-system.git`.
- Pushed: <https://github.com/OmarflorexAI/Barber-booking-system> (`main` tracks `origin/main`).
