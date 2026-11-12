# Progress: Barber Master (booking system)

Last updated: 2026-11-12. Source of requirements: `Barbershop Booking System PRD.md`.

## Where we are

**The backend (B1–B6) is built, tested and pushed. Stripe payments work end to end in Stripe test mode (2026-11-10). Resend login emails work. The landing page is being rebuilt on the Cocoon template (2026-11-11): M1 + M2 are done and committed (not pushed); M3 (motion) is done and committed (2026-11-12). L4 is next.** Twilio and Telegram are postponed (agreed 2026-11-10). Next: follow the **Mission plan** right below, starting at mission L4.

## Mission plan (START HERE next session)

This is the whole remaining job, in order. Each mission is one unit of work that ends with commits. The next agent works through the missions top to bottom with the workflow below, the same one used on 2026-11-11.

### The workflow (same as 2026-11-11)

1. **Start of session:**
   - Read `CLAUDE.md`, `AGENTS.md`, this file and `PRODUCT.md`.
   - Check that nothing stale is running. Last time, old `next start` servers on ports 3100, 3200 and 3417 skewed the measurements.
   - Start `npm run dev` in the background, plus `npm run stripe:listen` for anything that touches payments.
2. **Grill first when a mission has open decisions** (`/mattpocock-skills:grill-me`):
   - Ask in rounds of numbered questions. Give a recommended answer for each, worded so "yes" accepts it.
   - Ask the whole frontier at once.
   - Look facts up yourself or with a sub-agent; never ask the user for facts.
   - Record every answer in this file before building.
   - Missions marked **[grill]** need one; the others are already decided.
3. **Use `/impeccable` for design work:**
   - Run its `context` once per session.
   - For a new surface, write a direction contract with `impeccable surface-brief write`: THESIS, OWN-WORLD, STORY, FIRST VIEWPORT, FORM, FINISH.
   - Read `craft-floor.md` before any UI edit.
   - Modes: the landing is Persuade. The app screens are Operate: calmer and denser, but the same brand (grayscale, barber red, Geist).
4. **Build with a worker agent** (`general-purpose`, in the background). Its brief covers:
   - the files to read
   - the exact scope and the rules
   - the checks to run: typecheck, lint, build, the relevant e2e and engine tests, and `impeccable detect --json`
   - screenshots in `.impeccable/review/`, at 390 and 1440 px, in EN and ES
   - "do not commit"
5. **Check with a separate validator agent.** It didn't write the code and doesn't edit it.
   - It reports PASS/FAIL per criterion with evidence, and defects ordered by severity.
   - Send the defects back to the worker; SendMessage keeps its context.
   - Then re-check the key numbers yourself. For example, run Lighthouse on a production build, on a free port, with the PC idle.
6. **Show the user:**
   - screenshots and what changed
   - every copy claim the product might not back (the user confirms it or softens it)
   - anything the craft rules flag against a user decision
7. **Commit only after the user says so:**
   - Small conventional commits, staged by path (never `git add .`).
   - Show the proposed list first and scan for secrets.
   - End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
   - Update this file (status and next steps) and commit it too.
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
| L4 | Landing ship-ready | short [grill] for the /privacy and /terms wording | **NEXT** |
| G | System UI grill | **[grill]** | after L4 |
| U1 | Client booking `/b` + manage `/m` (with online payment) | covered by G | after G |
| U3a | Barber day view `/app/day` | covered by G | after U1 |
| U2 | Owner tools | covered by G, plus a short [grill] for the dashboard numbers | after U3a |
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
- The `/privacy` and `/terms` wording (L4).
- The payment provider for production (U5).
- The no-show question: does a no-show count as an online Booking and as time saved? This comes from B5; settle it before the U2 dashboard.
- The craft-rule conflict: the two pill labels on the landing are kept by the user's choice, but the finish review may flag them.
- Pushing to GitHub: the commits from 2026-11-11 are local only.

### Landing page v3: Cocoon template (decided 2026-11-11, grill session; START HERE)

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
- **M4 Ship-ready: NEXT.** Includes fixing the LCP (above) and the JS-off blank page. Found 2026-11-12:
  - The *observed* LCP is 0.5 s; Lighthouse's 2.8 s is its throttled simulation, which counts the landing's client JS. `/login` (same framework) gets 0.8 s, so trim the landing's JS: `lead-form.tsx` and `hero-phone.tsx` import the whole EN+ES `landing.ts` (~49 KB chunk); pass only the current locale's strings as props. The Turnstile code (~22 KB) is in the first load; load it with the form.
  - SEO 91 = the meta description is missing from `<head>`: `generateMetadata` reads the cookie, so Next streams it into `<body>` (by design; Googlebot reads it, Lighthouse doesn't). Proposed fix (ask the user): a real `/es` URL for the Spanish landing, so both versions are static (metadata in `<head>`, hreflang, prerendered, works with JS off), with `/` redirecting Spanish visitors by cookie / Accept-Language.
  - The `/privacy` and `/terms` copy (EN+ES) is drafted from the grill answers; it becomes `src/lib/i18n/legal.ts`. `/privacy` + `/terms` placeholders (EN/ES), restyled `not-found.tsx`, SEO (`metadataBase`, canonical, sitemap, robots, structured data; also fix the meta description/title landing in `<body>` with `generateMetadata`, Lighthouse SEO 91), `THIRD_PARTY_NOTICES.md` (photo credits + Cocoon MIT), e2e review, full validator run against the pass criteria on an idle PC, then the impeccable finish reviewer and the documenter (`DESIGN.md`).
- **Open with the user:** the impeccable skill bans pill labels above headings; the user chose two (Q23). Kept; the finish review may flag them.

### Landing page for Shop Owners (2026-11-10, not committed yet)

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
| Landing page | `src/app/page.tsx`, `src/app/_landing/` (one file per section; `ui.tsx` shared pieces; `nav-menu.tsx`, `features-list.tsx`, `head-viewer.tsx` client parts; `heads.ts` gallery manifest), `src/lib/i18n/landing.ts` (all EN/ES copy), `src/app/lead-form.tsx`, `src/app/actions.ts`, `public/landing/` (booking screenshots, head frames), `heads_reference_images/` |
| Leads | `supabase/migrations/20261111090000_leads.sql`, `src/server/leads/` (save, 24h repeat guard, email Platform admins, retry from the daily job), `leads()` in `src/server/senders.ts` |
| Scripts | `scripts/landing-shots.mjs` (`npm run landing:shots`, booking screenshots for the landing), `scripts/head-frames.mjs` (orbit video or frame folder → WebP turntable frames), `scripts/add-staff.mjs` (`npm run staff:add`), `scripts/telegram-webhook.mjs` (`npm run telegram:webhook`), `scripts/stripe.mjs` (`npm run stripe`, `npm run stripe:listen`; the CLI itself is in `tools/stripe/`, gitignored) |
| Tests | `tests/unit/` (availability, Twilio and Stripe signatures), `tests/engine/` (booking engine, dispatcher, texting, alerts, payments, shop admin, platform admin, leads; real database), `tests/e2e/` (race, Book now, landing). 143 + 9 in total. |

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

- **Follow the Mission plan at the top** (L3 → L4 → G → U1 → U3a → U2 → U3b → U4 → U5). The old landing and its 3D heads are gone.

**Left for the deploy (U5):**

- Every-minute scheduler for `/api/cron/dispatch` (Vercel Pro, or Supabase `pg_cron` + `pg_net`); `/api/cron/daily` at 11:00 and 12:00 UTC.
- Production Stripe webhook (Events from: Connected accounts; see B2 step 5), production Turnstile keys, a verified Resend domain, Sentry.
- Choose the payment provider that replaces Stripe (Square or Stripe; see the research notes).

**Small open items (no rush):**

- Confirm: a no-show still counts as an online Booking and as time saved in the numbers (B5 "Open after review").
- Photo uploads for Barber profiles (U3); `inviteBarber` has no automated test; alerts are English only.

## Git

- Local repo on branch `main`. Pushed up to 2026-11-10; the 2026-11-11 commits (3D cleanup, PRODUCT.md, photos + mark, landing v3 M1+M2) are **local only, not pushed**. `CLAUDE.md` is untracked on purpose.
- Remote already added: `origin` → `https://github.com/OmarflorexAI/Barber-booking-system.git`.
- Pushed: <https://github.com/OmarflorexAI/Barber-booking-system> (`main` tracks `origin/main`).
