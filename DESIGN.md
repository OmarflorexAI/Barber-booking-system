---
name: Barber Master
description: A booking system for barbershops, sold to Owners on a calm near-black page that proves itself with the real product.
colors:
  ground: "oklch(6% 0 0)"
  panel: "oklch(11% 0 0)"
  raised: "oklch(14% 0 0)"
  hairline: "oklch(18% 0 0)"
  muted-ink: "oklch(64% 0 0)"
  ink: "oklch(93% 0 0)"
  barber-red: "oklch(62% 0.2 27)"
  pure-black: "#000000"
  pure-white: "#ffffff"
typography:
  display:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body-lead:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  mono-time:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.625rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
rounded:
  control: "6px"
  bubble: "12px"
  panel: "16px"
  pill: "9999px"
spacing:
  gutter: "24px"
  panel-pad: "16px"
  panel-pad-sm: "24px"
  card-pad: "32px"
  card-pad-md: "40px"
  mini-card-pad: "20px"
  section-compact: "calc(24px + 4vh)"
  section-major: "calc(48px + 8vh)"
  column: "1024px"
  wide-column: "1152px"
components:
  button-primary:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.pure-black}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "rgba(255, 255, 255, 0.85)"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.pure-white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-outline-hover:
    backgroundColor: "rgba(255, 255, 255, 0.1)"
  nav-link:
    textColor: "{colors.muted-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "44px"
  nav-link-hover:
    textColor: "{colors.ink}"
  input-field:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "48px"
  card-black:
    backgroundColor: "{colors.pure-black}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.card-pad}"
  card-mini:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.mini-card-pad}"
  card-reading:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.card-pad}"
---

# Design System: Barber Master

## Overview

**Creative North Star: "The Shop After Hours"**

A calm, near-black page lit like a barbershop after closing: grayscale ground, near-white ink, hairline borders, and dimmed photographs of real shops sitting behind small dark product cards. Nothing on the page asks for attention except the one thing that is alive, a small barber-red dot. The page sells by showing the product working (an interactive booking phone, the alert, the reminder), so the visual system stays quiet around those depictions and lets them carry the proof.

The world is the Cocoon template's grayscale grammar (MIT, rebuilt in React and Tailwind v4, never copied in), pinned by the user, plus one accent. It is a one-column, generous, Persuade-mode system: a 1024px reading column, wide 1152px panels that open to the full window on scroll, white pill actions, rounded-2xl black cards. All motion is paint-only (opacity, translate, clip) so layout never moves, and every effect has a resting final state for reduced motion, no scroll-timeline support, or no JS.

This document records the shipped landing (`/`, `/es`), the legal pages (`/privacy`, `/terms` and their `/es` pairs) and the 404. **The app (`/b`, `/m`, `/login`, `/app/*`, `/admin`)** carries the same brand in a calmer, denser "Operate" mode. Its rules were decided in the G System UI grill (2026-11-13) and live in **[App (Operate mode)](#app-operate-mode)** at the end of this file; most of that section is decided but not yet built (it lands in missions U1 to U4). The old warm-paper `:root` tokens in `globals.css` are being replaced by the achromatic app ramp described there.

**Key Characteristics:**
- Near-black grayscale ground, near-white ink, one barber red reserved for live and status signals.
- Hanken Grotesk for everything; JetBrains Mono only for times, prices and numbers.
- Depth by tone steps and hairlines, not shadows.
- White pill = the action; outlined pill = the quieter action.
- Wide panels clipped to the column with 16px corners that open to full width on scroll.
- Photos always dimmed under dark UI cards; product depictions are the proof.

## Colors

A strictly achromatic dark ramp with a single warm red that only ever means "live" or "done".

### Primary
- **Barber Red** (`barber-red`): the pivot of the scissors mark, the pulsing "Today" dot on the first-month timeline, the "new" dot in the Barber alert card, and the booked check on the hero phone and booking card. 5.2:1 on the ground, so it would hold as text, but it is used as a signal fill, never as a button, link or heading color.

### Neutral
- **Closing-Time Black** (`ground`): the page ground everywhere inside `.landing`, also painted onto `html`/`body` so overscroll never flashes paper. Also the fill of mini cards and form fields.
- **Pure Black** (`pure-black`): the floating cards on photo panels (setup, pricing, contact) and the photo panels' base under dimmed images. One step below the ground, so cards read as cut-outs on photos.
- **Back-Room Panel** (`panel`): reading-page contact box, hover fill of the mobile menu button.
- **Raised Chrome** (`raised`): the highlighted "new" row and the text bubble inside product cards, the form's error notice.
- **Hairline** (`hairline`): every border in `.landing` by default (set in the base layer), section dividers, the facts grid's 1px gaps, the header's scrolled underline.
- **Ash Gray** (`muted-ink`): secondary text, nav links at rest, captions, timeline bodies. Lifted from the template's 60% to 64% so it stays at least 6:1 on every dark surface.
- **Barber-Cape White** (`ink`): primary text, focus ring, selection fill (with ground text).
- **Pure White** (`pure-white`): the primary pill's fill, headings set on photos, check marks on pricing cards.

On photos and over cards, white is used at fixed alphas rather than new tokens: `/80` for body on photos, `/30` for pill and link-underline strokes, `/25` for hovered field borders and the error notice, `/15` for the phone caption, `/10` for borders inside dark cards.

Product depictions (the hero phone's screens) show the real Client booking page in its own current light palette. They are pictures of the product, not landing tokens.

### Named Rules
**The Live Signal Rule.** Barber red marks only something alive or confirmed: the pivot, a pulsing live dot, a "new" dot, a booked check. Never a button, link, heading, border, error or decoration. If it isn't a status, it is grayscale.

**The No Tint Rule.** The ramp is achromatic (chroma 0). Do not warm or cool the grays; the photos bring the only other color.

## Typography

**Display Font:** Hanken Grotesk (Google Fonts, with ui-sans-serif, system-ui)
**Body Font:** Hanken Grotesk
**Label/Mono Font:** JetBrains Mono (Google Fonts), tabular, for times, prices and numbers only

**Product-wide (decided in G, 2026-11-13; swap lands in U1).** The user chose these two Google Fonts from a specimen (`.impeccable/review/fonts/specimen.html`, gitignored) to replace Geist and Geist Mono across the whole product, the landing included. Until U1 ships, the landing still renders Geist; the sizes, weights and tracking below were tuned on Geist and are re-checked on Hanken Grotesk at the swap (keep the steps, adjust tracking if headings look loose or cramped).

**Character:** One grotesque doing every job, tightened as it grows (headings carry negative tracking from -0.025em to -0.035em) and set in medium or semibold. Mono appears as tabular numerals, the way a booking screen shows a time or a price.

### Hierarchy

Sizes step up at breakpoints rather than fluidly; the frontmatter holds the phone size.

- **Display** (500, 2.25rem / 3rem at 640px / 3.75rem at 1024px, 1.08, -0.035em, balanced): the one h1 per page. The legal pages use the same weight and tracking at up to 3rem; the 404 sets two languages stacked at 1.875rem to 3rem, line-height 1.12.
- **Headline** (600, 1.875rem / 2.25rem at 640px, 1.1, -0.03em): section h2s. Pricing's price line ("Free") uses this voice at 2.25rem with room reserved for two lines so card dividers align.
- **Title** (600, 1.5rem / 1.875rem at 640px, 1.15, -0.025em): How-it-works step titles. Smaller card titles use 1.125rem semibold at -0.02em; legal h2s 1.25rem to 1.5rem semibold at -0.015em.
- **Body lead** (400, 1.125rem, 1.625): the hero subline, Why's lead (in ink, medium), contact intro.
- **Body** (400, 1rem, 1.625, `muted-ink`): section copy, kept to 48 to 65ch. Legal reading text runs 1.7 line-height at ink/80, inside a 68ch article.
- **Label** (500, 0.875rem): buttons, nav links, form labels, timeline "when" lines.
- **Mono time** (JetBrains Mono 400, 10px, tabular): slot times, durations and prices inside product cards only.

### Named Rules
**The One Family Rule.** Hanken Grotesk sets every word in the product, landing and app alike. Hierarchy comes from size, weight (400/500/600) and tracking, never from a second display face.

**The Mono Means Time Rule.** JetBrains Mono appears only where a booking screen would show a time, a duration, a price or a count (tabular figures, so columns of numbers line up). Never for body, labels, headings or decoration.

## Layout

A centered 1024px column (`max-w-5xl`) with 24px gutters holds text, nav and footer. Wide panels run on a separate 1152px column with a 16px pad (24px from 640px). Section rhythm is viewport-aware: compact bands use `calc(24px + 4vh)` top and bottom, major sections `calc(48px + 8vh)`. Anchor targets carry `scroll-mt-20` so the sticky header never covers a heading.

Recurring arrangements, all from the template's one-page grammar:
- **1/3 + 2/3 split:** heading in the first column, content in the other two (Why, FAQ, setup and pricing on photos where the two cards take the second and third thirds, offset vertically by 48px).
- **Zigzag rows:** text and a photo panel side by side from 1024px, the middle row flipped; text first in the DOM and on phones.
- **Bordered grid:** 2 columns on phones, 3 from 768px, hairlines drawn by 1px gaps over the border color.
- **Sticky-heading timeline:** the heading column sticks at 128px from the top from 768px while the timeline scrolls.
- **Centered card:** the contact form in a 672px card.

Breakpoints are Tailwind's (640, 768, 1024) plus a 400px step for the pill label's padding. Every interactive target is at least 44px tall; form fields and the send button 48px. No sideways scroll at 360 to 1440px in either language.

### Named Rules
**The Still Layout Rule.** Scroll effects move only opacity, translate and clip. Content boxes never change size or position in flow; the nav "shrinks" by translating, not by changing height.

**The Final State Rule.** Every animated element is defined at rest first. Without scroll-timeline support, under reduced motion or with JS off, the page shows each element in its final state.

## Elevation & Depth

The system is flat and tonal. Depth comes from a five-step achromatic ramp (pure black, ground, panel, raised, hairline) and from cards sitting on dimmed photographs. The sticky header is the one translucent surface: ground at 80% with a medium backdrop blur, gaining a hairline underline after 40 to 80px of scroll. Photos are darkened by top-down black gradients (85% on setup, 65% on pricing) or held at 45% opacity on black.

### Shadow Vocabulary
- **Top glow** (`box-shadow: 0 -20px 50px -15px rgba(255,255,255,0.05)`): the contact card only, a faint light from above, paired with a radial top highlight (`radial-gradient(80% 50% at 50% 0%, rgb(26,26,26) 0%, transparent 70%)`) that the pricing cards share.
- **Bezel ring** (`box-shadow: 0 0 0 1px rgba(255,255,255,.14)`): the hero phone's frame, so black on black still has an edge.

### Named Rules
**The Tone Not Shadow Rule.** Separate surfaces by stepping the ramp and drawing a hairline. Drop shadows are not part of the vocabulary; the two above are light-edge effects, not elevation.

## Shapes

Soft but not bubbly. Panels and cards share one corner (16px). Actions and labels are full pills. Small controls inside cards and text links' focus areas use 6px. The text bubble in the reminder card uses 12px with a 2px tail corner. Wide panels are a background layer clipped with `clip-path: inset(...) round 16px` to the 1152px column; on scroll the clip opens to the full window with square corners (user-accepted approach, 2026-11-12). The scissors mark is drawn in currentColor strokes and fills on a 32px grid; icons are 24px line drawings in one 1.5px round-capped stroke.

### Named Rules
**The One Corner Rule.** Anything that holds content (panel, card, photo box, form card) is 16px. Anything you press or read as a tag is a full pill or a 6px control. No other radii outside product depictions.

## Components

### Buttons
Two pills, one meaning each: confident and plain.
- **Shape:** full pill (9999px), at least 44px tall, 20px side padding, 0.875rem medium, no wrapping.
- **Primary (white pill):** white fill, black text. "Talk to us" in the nav, the first pricing card, the 404's home links, the form's Send (48px). Hover drops the fill to 85% white over 200ms.
- **Outline pill:** transparent with a white/30 stroke and white text; hover fills white/10. The quieter action (the second pricing card).
- **Text link with arrow:** underlined ink text, white/30 underline at offset 4px turning full white on hover, with a 16px up-right arrow (the hero's demo link).
- **Focus:** one ring everywhere, a 2px solid ink outline at 2px offset on `:focus-visible`.

### Cards / Containers
- **Black card:** pure black, 16px corners, 32px padding (40px from 768px), used on photo panels. Pricing cards add the hairline border and the radial top highlight; their header and list are split by a white/10 rule.
- **Mini product card:** ground fill, white/10 hairline, 16px corners, 20px padding, max 260px wide, centered on a black photo box (320px tall, 384px from 768px) whose photo sits at 45% opacity. Holds 10 to 12px text, mono times, 6px chips and a raised highlight row. This is how the real product is shown.
- **Reading card:** panel fill, hairline border, 16px corners, 24 to 32px padding (legal pages' contact box).

### Inputs / Fields
- **Style:** ground fill, hairline border, 6px corners, 48px tall, 16px text (prevents iOS zoom), muted placeholder; labels sit above in 0.875rem medium ink with "(optional)" in muted 13px.
- **Hover / Focus:** border lifts to white/25 on hover; on focus the border turns ink and the shared 2px focus ring appears.
- **Select:** native select with appearance removed and a 16px line chevron at the right.
- **Error:** a neutral notice (raised fill, white/25 border, 6px corners, line icon, `role="alert"`), not red: red stays a live signal.

### Navigation
Sticky header, ground at 80% with backdrop blur. Wordmark left; four section links centered as muted 0.875rem text turning ink on hover; the other language as a text link and the white "Talk to us" pill on the right. With scroll timelines the bar starts at 84px and settles to 69px over the first 80px of scroll by translation. Below 768px the links fold into a disclosure under the bar (48px rows, full-width white pill), closed by Escape, outside tap or a link tap. Legal pages and the 404 use a static header with only the wordmark and the language link.

### FAQ disclosure
Native `details` in a hairline-ruled list, one open at a time, the first open on load. Question in 1rem to 1.125rem medium ink; a 20px line plus rotates 45 degrees into a cross and turns ink when open; the answer unfolds to its height over 300ms.

### Wide Panel (signature)
A full-width background layer (gradient or photo) clipped to the 1152px column with 16px corners, content in the column above it. On scroll it opens to the full window: the hero over the first 50vh of page scroll, setup and pricing as they cross the viewport. Only the clip animates.

### Live Dot (signature)
An 11px (or 8px) barber-red dot with a red ring that scales to 2.6x and fades over 2s, running only while on screen. Still under reduced motion. The only repeating animation in the system.

### Brand mark
"Open scissors": two finger rings and tapered blades in currentColor crossing at a barber-red pivot with a knockout ring in the ground color. The wordmark pairs it (28px) with "Barber Master" in Hanken Grotesk semibold (Geist until the U1 swap), 17px, -0.02em. Source of truth: `public/brand/mark.svg`.

### Motion
Easing is a quick-out curve (`cubic-bezier(0.2, 0.8, 0.2, 1)`) for reveals and arrivals, an expo-out (`cubic-bezier(0.16, 1, 0.3, 1)`) for the FAQ and live ring. Blocks fade up 24px over their first 180px in view; How-it-works photos fade in from 5%. View transitions exist in three places only: the hero phone's screens (10px slide plus fade), the language switch (cross-fade) and moving between pages (12px rise plus fade); the header holds still on its own layer above them. Reduced motion sets every view transition to 0s.

## Do's and Don'ts

### Do:
- **Do** keep every surface on the achromatic ramp (ground, panel, raised, hairline) and step it to separate layers.
- **Do** use barber red only for live and status signals: pivot, live dot, "new" dot, booked check.
- **Do** make the white pill the single primary action in any view, with the outline pill for the quieter alternative.
- **Do** set every heading in Hanken Grotesk with negative tracking (-0.025em to -0.035em) and keep body text in muted ink at 48 to 65ch.
- **Do** show the real product (booking, alert, reminder screens) as the proof, on dimmed photos under small dark cards.
- **Do** use the one focus ring (2px solid ink, 2px offset) on every interactive element, and at least 44px targets.
- **Do** animate only opacity, translate and clip, behind `@supports (animation-timeline: view())` and `prefers-reduced-motion: no-preference`, with the final state as the default.
- **Do** ship every string in English and Spanish at equal visual weight.

### Don't:
- **Don't** use barber red for buttons, links, headings, borders or error states.
- **Don't** add pill labels above headings. The two on the landing (hero and first month) are a user-kept exception, not a pattern for other sections or future surfaces.
- **Don't** add drop shadows for elevation; use a tone step and a hairline.
- **Don't** introduce a second display face, or use JetBrains Mono outside times, durations, prices and counts.
- **Don't** show photos at full strength behind text; darken them with a black gradient or hold them at 45% on black.
- **Don't** imply customers, results or prices: no logo bars, testimonial cards, rating stars or number counters. The only price is "first month free".
- **Don't** animate layout properties or leave anything hidden until a script runs.

## App (Operate mode)

Decided in the G System UI grill (2026-11-13, all answers confirmed by the user; the record is in `progress.md` → "G grill answers"). This covers every screen that is not the landing: the Client pages `/b/<shopSlug>` and `/m/<token>`, `/login`, the staff app `/app/*` and the Platform admin panel `/admin`. Per-area direction contracts live in `.impeccable/surfaces/` (`src-app-b-shopslug.md`, `src-app-m-token.md`, `src-app-app-day.md`, `src-app-app-owner.md`, `src-app-app-me.md`, `src-app-admin.md`).

**Build status.** Everything in this section is **decided, not yet built**, unless marked otherwise. It lands in mission order: U1 (theme tokens, the theme switch, the product-wide fonts, `/b`, `/m`, `/login`), U3a (the `/app` shell and Day/Today), U2 (Owner Dashboard and Settings), U3b (Barber Me), U4 (`/admin`). Restyle vs rebuild: `/b`, `/m` and `/login` are **restyled** (their logic and e2e tests are kept); `/app/day` is **rebuilt** inside the new shell (its server actions are kept).

**Scene.** A Barber glances at a phone between cuts, under bright shop lights, clippers in one hand. A Client books on a small phone on the train or at the counter. An Owner checks the week on a phone at the chair or on a laptop at home at night. That is why the app is light by default, follows the phone, and keeps the landing's dark as the night option.

### App colors: two achromatic ramps, one red

Six tokens, defined on `:root` in `src/app/globals.css` for light and redefined for dark. Components use only these (through Tailwind's `--color-*` aliases); no hex or oklch values in components.

| Token | Role | Dark value (exact) |
| --- | --- | --- |
| `--paper` | The page ground behind everything. | `oklch(6% 0 0)` (the landing's ground) |
| `--surface` | Cards, sheets, the tab bar, the sidebar, inputs' fill where they sit on paper. | `oklch(11% 0 0)` (the landing's panel) |
| `--ink` | Primary text, icons, the primary pill's fill in light, the focus ring. | `oklch(93% 0 0)` |
| `--muted` | Secondary text: durations, labels, captions, finished rows. At least 4.5:1 on both `--paper` and `--surface`. | `oklch(64% 0 0)` |
| `--line` | Every hairline: row dividers, card and input borders, the tab bar's top edge. | `oklch(18% 0 0)` |
| `--red` | Barber red, live signals only (see below). | `oklch(62% 0.2 27)` |

- **Light** is the same six roles on a light, strictly achromatic ramp (chroma 0: no warm paper, no cool blue-gray). The exact light values live in `globals.css`; this file does not repeat them so the two can't drift. The pre-G warm tokens (`#f6f3ee` paper and friends, `--accent`) are retired.
- **Dark is the landing's ramp, not a second dark palette.** If a screen needs a third surface step (a pressed row, a sheet over a surface), the landing's raised step `oklch(14% 0 0)` is the dark value: add it as a token in both themes in `globals.css` first, never hard-code it.
- The No Tint Rule and the Tone Not Shadow Rule apply unchanged: separate layers by a tone step and a `--line` hairline. A bottom sheet may carry one soft shadow in light mode only if a tone step alone doesn't separate it; nothing else gets a shadow.

### Theme switching

- **Default:** follow the phone (`prefers-color-scheme`). With no saved choice, a phone in light mode gets light and a phone in dark mode gets dark.
- **Switch:** a sun/moon icon button in the header of every app screen, **right next to the language toggle**, at least 44px. It shows the theme you would switch to (moon in light, sun in dark), has an EN/ES accessible name ("Dark mode" / "Modo oscuro", "Light mode" / "Modo claro"), and tapping it flips the theme and saves the choice.
- **Saved** in a cookie, the same way `lang` is, so the server renders the right theme.
- **No flash.** The first paint is already in the right theme: the saved choice is rendered on `<html>` by the server, and with no cookie the CSS media query decides, so no script has to run first. The browser `theme-color` follows the theme.
- **Always dark, no switch:** `/login` (the bridge from the landing, in the landing's look), the landing, the legal pages and the 404.

### App typography

Hanken Grotesk for every word, JetBrains Mono (tabular) for times, prices and numbers: the One Family and Mono Means Time rules above apply in the app too. A Booking row's "10:30", a Service's "$35" and "45 min", and a dashboard count are mono; names, labels and buttons are not.

- **Body 16px** (1rem), line-height about 1.5. Also every input's text size (no iOS zoom).
- **Headings ≤ 1.5rem** in the app, semibold, light negative tracking. A fixed rem scale (no fluid type), steps about 1.2 apart: page title 1.5rem, section 1.25rem, row title 1rem semibold, meta 0.875rem.
- **Labels** 0.875rem medium. Nothing below 0.75rem, and 0.75rem only for tags.

### Density and size

- Booking rows **≥ 56px** tall; Settings and list rows the same.
- Buttons **≥ 48px** tall; icon buttons and toggles ≥ 44px.
- Content column: phones get 16px side gutters; Settings and Me pages hold a reading column (about 640px) on desktop; Day/Today and the Dashboard use the full width on desktop.
- Lists are hairline-ruled rows on `--paper` or inside one `--surface` card, not a card per row.
- No sideways scroll at 360px. Phones first for Clients and Barbers; Owners phone-first but laid out properly on desktop; Platform admins desktop-first, usable on a phone.

### The Live Signal Rule in the app

Barber red still means only "alive" or "confirmed":

- **The now line** across Day/Today at the current time (a red line with a small red dot at its start), only on today's date.
- **The new-Booking dot** on a row that arrived since the Barber last looked.
- **The booked check** on the Client's "You're booked" screen and in `/m`'s confirmed state.

Everything else is grayscale. In particular the **"Paid online" tag is gray**, with a small card icon (a gray pill with `--line` border, `--muted` or `--ink` text), never red. Errors are not red. Cancel and remove are not red. Selected states, links and active tabs are not red.

### App buttons

- **Primary:** a full pill, at least 48px tall, **black with white text in light, white with black text in dark** (`--ink` fill, `--paper` text). One primary per view.
- **Secondary:** an outlined pill (`--line` border, `--ink` text), hover fills one tone step.
- **Destructive (Cancel a Booking, Remove a Barber, Cancel a Shop):** a **gray** pill or a gray sheet row, never red, and always behind a **confirm step** that says what happens (for example whether the Client is refunded and texted). The confirm's own button is the primary pill with the plain verb ("Cancel booking" / "Cancelar cita").
- Disabled: 40% opacity, no hover. Loading: the label stays, a small inline indicator replaces the icon, and the button can't be pressed twice.
- Focus: the one ring (2px solid `--ink`, 2px offset) on everything.

### Navigation per role

| Role | Phone | Desktop (≥ 1024px) | Sign out |
| --- | --- | --- | --- |
| Barber | Bottom tabs **Day · Me** | The same two items in the shared `/app` left sidebar | Bottom of **Me** |
| Owner | Bottom tabs **Today · Dashboard · Settings**, plus **Me** when the Owner also cuts hair | A **left sidebar** with the same items | Bottom of **Settings** |
| Platform admin | `/admin` top nav **Shops · Failures · Access log** (wraps or scrolls on a phone) | Same top nav | In the top nav |

- A Platform admin who is also Shop staff gets a switch between `/admin` and `/app` in the top nav (and in Me/Settings on the `/app` side).
- **After sign-in:** Barber → Day, Owner → Today, Platform admin → `/admin` (or `/app` when also Shop staff).
- Tabs: icon (24px line) plus a label in both languages, the active tab in `--ink` with a filled icon, the others `--muted`. The tab bar sits on `--surface` with a `--line` top edge and respects the phone's safe area.
- Every app header holds: the page or Shop name on the left; the language toggle and the theme switch on the right.

### Bottom sheets for row actions

Tapping a Booking row opens a **bottom sheet** (a real `<dialog>`, not a custom overlay): the Client's name, Service, time and paid status on top, then full-width 56px action rows (Day: **Arrived · No-show · Move · Cancel**, plus tap-to-call). Destructive rows are gray and lead to the confirm step inside the same sheet. The sheet closes on the backdrop, Escape, a swipe down or after an action; focus returns to the row. It slides up with a transform in about 200ms and appears instantly under reduced motion. On desktop the same content and order can sit in a centered dialog. Modals are not used for anything a sheet or an inline section can do.

### States

- **Loading:** skeletons shaped like the real layout (rows, cards, the bar chart's outline) in a `--line`/`--surface` tone, with a slow opacity pulse that stops under reduced motion. **No spinners** in content.
- **Empty:** **one sentence plus the one next action** (for example "No bookings today." + "Add walk-in"). No illustrations, no "nothing here".
- **Error:** a **neutral notice** next to the action that failed (a `--surface` box, `--line` border, 6px corners, a line icon, `role="alert"`), saying what happened and what to do next in plain words. The user's input is kept. Never red.
- Engine `BookingError` codes map to these messages in EN and ES; a slot that was just taken is a normal, calm state, not an error page.

### Shape, icons and motion in the app

The landing's shapes carry over: 16px for cards and sheets' top corners, full pills for buttons and tags, 6px for inputs and small controls. Icons are 24px line drawings in one 1.5px round-capped stroke. Motion is state only, 150 to 250ms, transform and opacity, with the final state as the default and nothing hidden until a script runs. The wide-panel, scroll-timeline and live-ring effects are landing-only.

### App Do's and Don'ts

#### Do:
- **Do** build every app color from the six tokens, in both themes, and check each screen in light and dark at 360px and 1440px, EN and ES.
- **Do** keep red to the now line, the new-Booking dot and the booked check.
- **Do** make the black (light) / white (dark) pill the one primary action per view, at least 48px tall.
- **Do** set times, prices and counts in JetBrains Mono with tabular figures, and everything else in Hanken Grotesk.
- **Do** put row actions in a bottom sheet and destructive actions behind a confirm that says what happens to the Client and their money.
- **Do** give every list a skeleton, an empty state (one sentence + one action) and a neutral error that keeps the input.
- **Do** keep the theme switch next to the language toggle on every app screen, and render the saved theme with no flash.
- **Do** use the PRD's terms in the copy: Shop, Owner, Barber, Client, Booking, Walk-in, Service, Platform admin.

#### Don't:
- **Don't** make "Paid online", errors, Cancel, Remove, links or the active tab red.
- **Don't** add a warm or cool tint to the light ramp, or a second dark palette.
- **Don't** put headings above 1.5rem in the app, or rows below 56px, or buttons below 48px.
- **Don't** use spinners in content, or empty states without a next action.
- **Don't** open a modal where a sheet or an inline section works, or a card per row where a ruled list works.
- **Don't** show goals, targets, trend lines or invented numbers on the Dashboard; show this week's real counts beside last week's.
- **Don't** let `/login` follow the theme: it stays dark.
