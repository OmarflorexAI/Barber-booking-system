---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/_landing"]
---

# Landing page (`/`)

Scope: the marketing page for barbershop Owners, plus `/privacy`, `/terms` and the 404 page in the same look. Mode: Persuade.

Audience: Owners of independent barbershops in the Bronx and upper Manhattan, often Spanish-first, judging us on a phone between cuts. Action: leave a lead in the "Talk to us" form (`#contact`). Proof: the working pretend booking on the hero phone, plus the real product's screens as mini UI cards. No customers, numbers or testimonials exist; none may be implied.

Constraints: the visual direction is pinned by the user: the Cocoon template (templatedeck.com, MIT), rebuilt in React and Tailwind v4, plus a small barber red. All copy EN/ES. Decisions log: `progress.md` → "Landing page v3".

## Direction contract

THESIS: A calm, near-black page that proves the product by letting the Owner book a pretend cut on the hero phone, then shows the same booking reaching the Barber and the Client. It refuses the category default of feature-tile grids, fake logos and testimonial carousels.

OWN-WORLD: The Cocoon world: ground oklch(6% 0 0), panels oklch(9–14% 0 0), hairline borders oklch(18% 0 0), near-white ink, gray secondary text oklch(60% 0 0) (lifted to ≥4.5:1 where it's body text). One accent, barber red, used only for live and status signals (the pivot dot, live dots, the timeline's "Today" dot, the booked check). Geist for everything, Geist Mono only for times and prices. Rounded-2xl panels, white pill buttons, outlined pill buttons. Photos sit dimmed under small dark UI cards; wide photo panels grow from the container to full width on scroll.

STORY: The Owner sees the phone and taps through a booking. They understand that a Client books without calling. They see the alert and the reminder and how setup happens in one visit, believe that the first month is free and there's no contract, and leave their number.

FIRST VIEWPORT: Nav: wordmark left; How it works · Setup · Pricing · FAQ centered; Español/English and a white "Talk to us" pill right. Pill label "For barbershops in the Bronx & upper Manhattan", then the h1 "Stop answering the phone in the middle of a cut." across two-thirds of the container, a short subline. Below that, the wide gradient panel (max 1152px, growing to 100vw on scroll) with the interactive phone centered. On phones the phone starts at the fold.

FORM: Pinned by the user (the Cocoon template's one-page grammar: hero panel, bordered 3×2 grid, zigzag rows over photos, a photo section with cards, a sticky-heading timeline, two pricing cards on a photo, a centered contact card). Not from the ordered list. seed: none (direction pinned by user; no roll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
