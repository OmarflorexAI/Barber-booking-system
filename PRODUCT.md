# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Shop Owners** of independent barbershops in the Bronx and upper Manhattan. They decide whether to buy. Today they take bookings by phone, WhatsApp, Instagram DMs and a paper notebook. Many are Spanish-first. They come to the landing page (`/`) to judge us and leave a lead.
- **Clients** book a cut on their phone from the Shop's link or counter QR code (`/b/<shopSlug>`) and manage it from a signed link (`/m/<token>`). No account, no app; usually in a hurry, often on a small or older phone.
- **Barbers** work from `/app/day` between cuts, with clippers in hand: see the day, mark arrived/no-show, add walk-ins.
- **Platform admins** (our team) create Shops, import client lists, register texting and give support.

## Product Purpose

Barber Master is a booking system for barbershops. It lets a Client book from a link in under a minute, pay online or in person, and get a text with a cancel/change link. The Barber gets an alert instead of a phone call, and the Owner sees bookings per week and the time saved. Success = Barbers stop picking up the phone mid-cut, fewer empty chairs from no-shows, and an Owner who can say how many bookings came in this week.

## Positioning

We don't compete on price (booking tools cost a four-Barber Shop $0 to about $90 a month). We sell **a setup done for the Owner, in Spanish and English, with a real person who answers when something breaks**. The landing page sells that, not a feature list.

## Operating Context

- We set up every Shop ourselves in one visit: create the Shop, import the client list, register it for texts, train the Owner.
- The first month is free; billing is by hand after that. After the first month: one monthly price, no contract, cancel anytime, and the Owner takes their client list with them (export + deletion 30 days after cancelling).
- Times are shown in America/New_York. Every user-facing string exists in English and Spanish, starting in the phone's language with a toggle.

## Capabilities and Constraints

- Built: booking engine (no double booking, "any available Barber"), online payment with a 10-minute hold and full refunds (Stripe test mode, a placeholder provider), Client texts (Twilio), Barber alerts (Telegram with email fallback), daily Owner email, Owner tools and reporting, Platform admin tools, landing lead form (saved and emailed to Platform admins).
- **Not live yet:** Twilio and Telegram keys are postponed, so texts and Telegram alerts only print to the log. Marketing copy may describe them only once they really work at launch.
- A Shop has at most 6 active Barbers.
- Stack: Next.js 16 App Router, Tailwind v4, Supabase, Cloudflare Turnstile on public forms.
- Terms (PRD): Shop, Owner, Barber, Client, Booking, Walk-in, Service, Platform admin.

## Brand Commitments

- Name: **Barber Master** (final).
- Landing page rules: no fake testimonials, customers, logos or numbers; the only price shown is "first month free".
- Bilingual EN/ES everywhere, written for real people, not marketing-speak.

## Evidence on Hand

None yet: no pilot Shop signed and no shop visits done. Nothing about customers, results or usage may be claimed or implied until real evidence exists. Product screenshots and the interactive demo phone are honest evidence of the product itself.

## Product Principles

1. **Done for you.** Owners never have to configure anything technical; we do the setup.
2. **Phone first and fast.** A Client books in under a minute on any phone with no account; Barbers act with one thumb between cuts.
3. **Spanish and English as equals.** Neither language is a translation afterthought.
4. **Only true claims.** Show the real product; never invent proof.
5. **Calm for everyone.** Rules handle themselves (holds, refunds, the no-show rule) so nobody has to manage or argue.

## Accessibility & Inclusion

WCAG AA: text contrast ≥ 4.5:1, visible keyboard focus, reduced motion respected. Large tap targets for small phones. Full EN/ES parity.
