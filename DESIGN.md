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
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body-lead:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  mono-time:
    fontFamily: "Geist Mono, ui-monospace, monospace"
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

This document records the shipped landing (`/`, `/es`), the legal pages (`/privacy`, `/terms` and their `/es` pairs) and the 404. **Future, not built:** the brand is meant to carry into the app (`/b`, `/m`, `/app/*`) in a calmer, denser "Operate" mode. Light or dark, density and type scale for that mode are open questions for the G System UI grill; nothing below should be read as already deciding them. The warm-paper `:root` tokens in `globals.css` (`--paper`, `--ink`, `--accent` and friends) belong to the pre-G app screens and are not part of this system.

**Key Characteristics:**
- Near-black grayscale ground, near-white ink, one barber red reserved for live and status signals.
- Geist for everything; Geist Mono only for times and short product metadata.
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

**Display Font:** Geist (with ui-sans-serif, system-ui)
**Body Font:** Geist
**Label/Mono Font:** Geist Mono, for times and short metadata only

**Character:** One neo-grotesk doing every job, tightened as it grows (headings carry negative tracking from -0.025em to -0.035em) and set in medium or semibold. Mono appears as small tabular numerals inside product cards, the way a booking screen shows a time.

### Hierarchy

Sizes step up at breakpoints rather than fluidly; the frontmatter holds the phone size.

- **Display** (500, 2.25rem / 3rem at 640px / 3.75rem at 1024px, 1.08, -0.035em, balanced): the one h1 per page. The legal pages use the same weight and tracking at up to 3rem; the 404 sets two languages stacked at 1.875rem to 3rem, line-height 1.12.
- **Headline** (600, 1.875rem / 2.25rem at 640px, 1.1, -0.03em): section h2s. Pricing's price line ("Free") uses this voice at 2.25rem with room reserved for two lines so card dividers align.
- **Title** (600, 1.5rem / 1.875rem at 640px, 1.15, -0.025em): How-it-works step titles. Smaller card titles use 1.125rem semibold at -0.02em; legal h2s 1.25rem to 1.5rem semibold at -0.015em.
- **Body lead** (400, 1.125rem, 1.625): the hero subline, Why's lead (in ink, medium), contact intro.
- **Body** (400, 1rem, 1.625, `muted-ink`): section copy, kept to 48 to 65ch. Legal reading text runs 1.7 line-height at ink/80, inside a 68ch article.
- **Label** (500, 0.875rem): buttons, nav links, form labels, timeline "when" lines.
- **Mono time** (Geist Mono 400, 10px, tabular): slot times and service meta inside product cards only.

### Named Rules
**The One Family Rule.** Geist sets every word on the page. Hierarchy comes from size, weight (400/500/600) and tracking, never from a second display face.

**The Mono Means Time Rule.** Geist Mono appears only where a booking screen would show a time or duration. Never for body, labels or decoration.

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
"Open scissors": two finger rings and tapered blades in currentColor crossing at a barber-red pivot with a knockout ring in the ground color. The wordmark pairs it (28px) with "Barber Master" in Geist semibold, 17px, -0.02em. Source of truth: `public/brand/mark.svg`.

### Motion
Easing is a quick-out curve (`cubic-bezier(0.2, 0.8, 0.2, 1)`) for reveals and arrivals, an expo-out (`cubic-bezier(0.16, 1, 0.3, 1)`) for the FAQ and live ring. Blocks fade up 24px over their first 180px in view; How-it-works photos fade in from 5%. View transitions exist in three places only: the hero phone's screens (10px slide plus fade), the language switch (cross-fade) and moving between pages (12px rise plus fade); the header holds still on its own layer above them. Reduced motion sets every view transition to 0s.

## Do's and Don'ts

### Do:
- **Do** keep every surface on the achromatic ramp (ground, panel, raised, hairline) and step it to separate layers.
- **Do** use barber red only for live and status signals: pivot, live dot, "new" dot, booked check.
- **Do** make the white pill the single primary action in any view, with the outline pill for the quieter alternative.
- **Do** set every heading in Geist with negative tracking (-0.025em to -0.035em) and keep body text in muted ink at 48 to 65ch.
- **Do** show the real product (booking, alert, reminder screens) as the proof, on dimmed photos under small dark cards.
- **Do** use the one focus ring (2px solid ink, 2px offset) on every interactive element, and at least 44px targets.
- **Do** animate only opacity, translate and clip, behind `@supports (animation-timeline: view())` and `prefers-reduced-motion: no-preference`, with the final state as the default.
- **Do** ship every string in English and Spanish at equal visual weight.

### Don't:
- **Don't** use barber red for buttons, links, headings, borders or error states.
- **Don't** add pill labels above headings. The two on the landing (hero and first month) are a user-kept exception, not a pattern for other sections or future surfaces.
- **Don't** add drop shadows for elevation; use a tone step and a hairline.
- **Don't** introduce a second display face, or use Geist Mono outside times and durations.
- **Don't** show photos at full strength behind text; darken them with a black gradient or hold them at 45% on black.
- **Don't** imply customers, results or prices: no logo bars, testimonial cards, rating stars or number counters. The only price is "first month free".
- **Don't** animate layout properties or leave anything hidden until a script runs.
