---
version: 1
slug: "src-app-app-day"
primary_target: "src/app/app/day/page.tsx"
related_targets: ["src/app/app/day/day-actions.tsx", "src/app/app/day/actions.ts", "src/app/app/layout.tsx"]
---

# Barber Day and Owner Today (`/app/day`)

Scope: the staff app's shell (header, bottom tabs, the sidebar from 1024px) and its first screen: a Barber's **Day** and the Owner's **Today** (all Barbers). Mode: Operate. Mission U3a. **Rebuild** in the new shell; the existing server actions are kept. `src/app/app/layout.tsx` is the planned home of the shell.

Audience: Barbers on a phone between cuts, under bright shop lights, often with clippers in one hand; Owners checking the whole Shop on a phone at the chair or on a desktop. Action: know who's next, mark arrived or no-show, add a Walk-in, move or cancel a Booking (the Client is texted and refunded by the engine). Proof: the day itself.

Constraints: the engine owns every rule (no double booking, Walk-ins block time, a move keeps the payment, a Barber or Shop cancel refunds in full and texts the Client through the outbox). A Barber sees only their own Bookings and their own Clients' names and phones; the Owner can do everything a Barber can for any Barber. Times in New York time. Navigation: Barber tabs **Day · Me**; Owner tabs **Today · Dashboard · Settings** (+ **Me** if they cut hair), sidebar from 1024px. After sign-in a Barber lands here on Day and an Owner on Today. Global rules: `DESIGN.md` → "App (Operate mode)"; decisions: `progress.md` → "G grill answers".

## Direction contract

THESIS: The day as a timetable read in one glance: time-ordered rows with a red now line cutting through, finished rows fading behind it, and one big Add walk-in button under the thumb. It refuses the category default of a week calendar grid with tiny colored blocks and a toolbar of icons.

OWN-WORLD: the app ramp (light by default, follows the phone, sun/moon switch), Hanken Grotesk, JetBrains Mono for every time and duration in a fixed left column. Hairline-ruled 56px+ rows on `--paper`, gray tags ("Paid online" with a card icon, "Walk-in", "Arrived", "No-show"), finished rows in `--muted`, a bottom sheet for row actions, the tab bar on `--surface`. Red only for the now line, the new-Booking dot and nothing else.

STORY: The Barber opens the app, sees where "now" is and who's next, taps the row when the Client walks in to mark Arrived, logs a Walk-in in two taps, and moves or cancels a Booking knowing the Client will be told. The Owner sees every chair at once and can do the same for anyone.

FIRST VIEWPORT: Barber, phone 390px. Header: "Day" and the date ("Fri, Nov 13") left; EN/ES toggle and theme switch right. Under it the date bar: ‹ · Today · ›. The list scrolled so the red now line sits in the top third: each row has the start time in mono left (end time muted below), the Client's name semibold, Service and duration muted, and gray tags at the right. A red dot before the name marks a new Booking. The black (light) / white (dark) **Add walk-in** pill, full width, 56px, fixed just above the **Day · Me** tab bar. Owner phone: the same, titled "Today", with Barber filter chips (All, Carlos, Dre…) under the date bar and each row naming its Barber. Owner desktop: the sidebar left, one column per Barber (up to 6) under a shared time axis, the now line across all columns.

FORM: Operate, a standard agenda list (phone) and resource-column day view (desktop) with a bottom sheet, built from standard web controls. Code-led. seed: none (direction pinned by the user in the G grill; no roll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Screens

1. **Day / Today list.** Bookings and Walk-ins in time order, breaks and time off shown as quiet muted bands. Rows before now dim once finished. The now line moves every minute and appears only on today's date. The list refreshes when the app comes back to the foreground.
   - Loading: skeleton rows in the real layout (and skeleton columns on desktop). Empty: "No bookings today." + "Add walk-in". Day off: "You're off this day." (Owner: "Nobody is working this day." or the Shop closed-day name). Other dates use the same list without the now line.
2. **Row sheet** (bottom sheet). Client name, phone with a **tap-to-call** button, Service, time, Barber (Owner), and paid status. Actions as 56px rows: **Arrived · No-show · Move · Cancel**. Actions the engine doesn't allow yet (for example No-show before the start time) are disabled with a one-line reason. Arrived and No-show can be undone from the same sheet.
3. **Move.** A time picker for the same Barber (the `/b` picker in staff form). Says "The Client gets a text with the new time. Their payment stays." Error: time taken, neutral notice, pick another.
4. **Cancel confirm** (inside the sheet, gray button). Says what happens: "The Client gets a text. They paid online, so they get a full refund of $35." Primary: "Cancel booking"; secondary: "Keep".
5. **Add walk-in** (sheet). Service (list), start time (defaults to now rounded to the slot grid, editable), Barber (Owner only, defaults to the filter's Barber). No Client details (the engine logs a Walk-in as Barber, Service and time, already arrived). Primary: "Add walk-in". Error: that time overlaps a Booking: neutral notice with the next free time offered, input kept.
6. **Shell.** Header on every `/app` screen; bottom tabs on phones; on desktop from 1024px a left sidebar with the same items, the Shop's name and the signed-in person's name at its foot. A Platform admin who is also staff gets the switch to `/admin`.

Errors in general: a neutral notice next to the action, saying what happened and what to do, with the input kept. Never red. Engine `BookingError` codes map to these messages.

EN/ES: the app uses the signed-in person's language (the `lang` cookie, else the phone). Every label, tag, sheet action and confirm sentence in both languages; tags must fit at 360px in Spanish ("Pagado en línea", "No se presentó").
