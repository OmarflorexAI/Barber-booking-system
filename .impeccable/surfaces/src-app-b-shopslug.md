---
version: 1
slug: "src-app-b-shopslug"
primary_target: "src/app/b/[shopSlug]/page.tsx"
related_targets: ["src/app/b/[shopSlug]/booking-flow.tsx", "src/app/b/[shopSlug]/actions.ts"]
---

# Client booking (`/b/<shopSlug>`)

Scope: the public page where a Client books one Service with a Barber at a free time, and pays online or at the Shop. Mode: Operate. Mission U1. **Restyle**, not rebuild: the booking logic and the e2e tests are kept. U1 also adds the online payment choice with the Checkout redirect, the "awaiting payment" and "payment expired" states, fixes the "Book now" button and the "2 upcoming bookings to pay at the shop" wording, and fixes `<html lang>` staying `en` after switching to Spanish.

Audience: Clients on their phones, often small or older phones, often Spanish-first, in a hurry, with no account and no app. They arrive from the Shop's link (Instagram bio, a text) or the counter QR code. Action: book in under a minute. Proof: none needed beyond the Shop's own name and real free times.

Constraints: the page holds no booking rules; it only calls the booking engine. Times from 30 minutes to 30 days ahead, shown in New York time. Name and phone only, a consent line for texts, Cloudflare Turnstile. Online payment only when the Shop has connected payments, else only "Pay at the Shop". **Checkout is cards only** (cards, Apple Pay, Google Pay) on the provider's hosted page; the card never touches us. The refund and cancel rule is shown before paying. An online Booking holds its time 10 minutes as `pending_payment`. At most 2 active unpaid Bookings per phone. No Shop logo uploads in v1. Texts are log-only until Twilio is live: any copy promising a text must be confirmed with the user before launch. Global rules: `DESIGN.md` → "App (Operate mode)"; decisions: `progress.md` → "G grill answers".

## Direction contract

THESIS: The Shop's own booking line, one question per screen with a step counter on top, so a Client books with one thumb in under a minute. It refuses the category default of a marketplace page: ratings, upsells, an account wall, a month calendar grid, a Barber Master brand louder than the Shop.

OWN-WORLD: the app ramp (light by default, dark when the phone is dark), Hanken Grotesk, JetBrains Mono for every time, duration and price. Hairline-ruled Service and Barber lists at 56px+ rows, Barbers shown by photo or an initials disc, times as 48px mono pills grouped Morning / Afternoon / Evening, the black (light) / white (dark) pill pinned within thumb reach. Barber red appears once: the booked check on the Done screen.

STORY: The Client sees the Shop's name, picks a Service by price and length, picks a Barber they like or "Any available", taps a free time, gives a name and phone, chooses to pay at the Shop or now by card after reading the refund rule, and sees "You're booked" with everything they need.

FIRST VIEWPORT: Phone, 390px. Header: the Shop's name left (semibold, 1.25rem) with its address or phone muted below; EN/ES toggle and theme switch right. Under it the step counter "Step 1 of 5 · Service". Then the Service list: name left, duration in mono muted under it, price in mono right; a special shows its price, the regular price struck through and "until Nov 30" muted. Tapping a row is the action, so step 1 has no button. From step 3 on, the primary pill sits at the bottom of the screen. Footer: a small Barber Master mark.

FORM: Operate, the platform's standard mobile wizard (step counter, list rows, chip pickers, form, confirmation), built from standard web controls. Code-led. seed: none (direction pinned by the user in the G grill; no roll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Screens

1. **Service.** Every active Service with duration and price; specials marked with their end date. Back is never needed here.
   - Loading: skeleton rows. Empty (no Services or no active Barbers): "This Shop isn't taking online bookings right now." + a tap-to-call button for the Shop. Unknown or cancelled Shop: the bilingual 404.
2. **Barber.** "Any available" first, explained as "The first free Barber". Then each Barber who does that Service: photo or initials, name, specialties muted. A secondary tap opens a profile sheet with photo, bio, specialties and the 3 to 6 photo gallery.
   - Loading: skeleton rows. A Barber with no photo shows initials; a gallery under 3 photos shows what exists, never placeholders.
3. **Time.** A date strip (today to 30 days, scrolls sideways inside itself; the page never does) and the free times for that day as mono pills. Shop closed days and days off are shown as unavailable, not hidden.
   - Loading: skeleton pills. Empty day: "No free times this day." + "Next free day". No times in 30 days: one sentence + tap-to-call.
4. **Details and payment.** Name, phone (`type=tel`), the consent line, then "Pay at the Shop" / "Pay now by card" (only when the Shop has online payments). The refund and cancel rule in plain words above the button. Primary: "Book" or "Continue to payment".
   - Errors, as neutral notices next to the button, input kept: the time was just taken ("That time was just taken. Pick another one." and back to Time with Service and Barber kept); too many unpaid Bookings (reworded plainly, saying the limit and what to do); a blocked number ("We can't book this number online. Please call the Shop." + tap-to-call); bot check failed (try again).
5. **Awaiting payment.** Shown on return from Checkout until the payment is confirmed: "Confirming your payment…" with the held time and Barber; it turns into Done on its own.
   - **Payment expired, pick a time again:** the 10-minute hold ran out; one sentence, the Service and Barber kept, the primary pill back to Time. Payment cancelled at Checkout: same calm message, time still held if the hold hasn't run out.
6. **Done.** The red booked check, "You're booked", Barber, Service, day and time (mono), price and "Paid online" (gray tag with a card icon) or "Pay at the Shop", the Shop's address and phone, and how to change or cancel (the link in the text, and the manage link on screen when the flow has it).

EN/ES: the page starts in the phone's language, the toggle switches every string and sets `<html lang>`. Day and month names and the time format follow the language; times always say New York time where it could be misread. Every message above exists in both languages at equal length and weight.
