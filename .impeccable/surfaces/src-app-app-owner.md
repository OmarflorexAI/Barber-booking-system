---
version: 1
slug: "src-app-app-owner"
primary_target: "src/app/app/dashboard/page.tsx"
related_targets: ["src/app/app/settings"]
---

# Owner Dashboard and Settings (`/app/dashboard`, `/app/settings/*`)

Scope: the Owner's **Dashboard** tab and the **Settings** tab with its pages. Mode: Operate. Mission U2 (planned routes; nothing here is built yet). **The user will send a dashboard reference image at U2**: it may change the Dashboard's arrangement, not the rules below (no fake goals, real counts only, red only for live signals). The all-Barbers calendar is Today, in `src-app-app-day.md`.

Audience: Owners of independent Shops, phone-first (at the chair, after closing) but laid out properly on a laptop. Often Spanish-first, not technical: we did the setup. Action: see whether the system is being used this week and the time it saved; change prices, hours, Barbers and rules without calling us. Proof: their own numbers from `reporting.weeklyStats`.

Constraints: Owner only (`requireOwner`). Week = Monday to Sunday, New York time. Time saved = online Bookings × the Shop's minutes per manual booking (set by a Platform admin at the install visit). **No-shows keep counting as online Bookings and as time saved** (as built), and are also shown on their own. No revenue, goals, targets, trend lines or invented numbers. Max 6 active Barbers (DB trigger `BB002`). A Barber with upcoming Bookings can't be removed until they're cancelled or moved. Closed days can't be saved over Bookings. Sign out sits at the bottom of Settings. Global rules: `DESIGN.md` → "App (Operate mode)"; decisions: `progress.md` → "G grill answers"; backend: `progress.md` → "B5".

## Direction contract

THESIS: This week in four honest numbers, Bookings, Walk-ins, No-shows and Time saved, each with last week beside it and a bar per day underneath; and Settings as a plain list of pages, each fixing one thing on a phone. It refuses the category default of a KPI wall with goal rings, green/red trend arrows, revenue charts and a mega settings form.

OWN-WORLD: the app ramp (light by default, follows the phone), Hanken Grotesk, JetBrains Mono for every count, duration and price. Number cards on `--surface` with 16px corners and a `--line` border; a single-series bar chart in `--ink` bars on `--line` gridlines, today's bar marked by weight, not color; Settings as hairline-ruled 56px rows with a chevron. No red anywhere on these pages.

STORY: The Owner opens Dashboard and sees how many Bookings came in this week against last week and how much phone time that saved, then goes to Settings to put a special on a Service, close the Shop for a holiday, or invite a new Barber, and trusts that the rules (cutoff, blocklist, payments) are where they left them.

FIRST VIEWPORT: Dashboard, phone 390px. Header: "Dashboard" left; EN/ES toggle and theme switch right. A line under it: "This week · Nov 9–15". A 2×2 grid of number cards: label (Bookings, Walk-ins, No-shows, Time saved), the number in mono at 1.5rem, and "Last week 18" muted under it; Time saved reads "3 h 20 min". Below, the Bookings-per-day bar chart, Mon to Sun, with day labels and counts. A one-line muted note under Time saved: how it's calculated, with the Shop's own minutes. Bottom tabs **Today · Dashboard · Settings** (+ Me). Desktop: the sidebar left, four cards in one row, the chart full width below.

FORM: Operate, a standard small-business dashboard (stat cards + one bar chart) and a standard settings index with detail pages, built from standard web controls. Code-led. seed: none (direction pinned by the user in the G grill; the U2 reference image may refine the Dashboard's arrangement).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Screens

1. **Dashboard.** As in the first viewport. A week picker (‹ ›) may step back through past weeks.
   - Loading: skeleton cards and a skeleton chart outline. Empty (a new Shop, all zeros): the zeros are shown honestly, plus one line: "Share your booking link to get your first online booking." + "Booking link & QR". Error: neutral notice with "Try again".
2. **Settings index.** Rows: Services & prices · Hours & closed days · Barbers · Booking rules · Blocklist · Online payments · Booking link & QR · Export clients. At the bottom: the Shop's name, the switch to `/admin` for a Platform admin, and **Sign out**.
3. **Services & prices.** List: name, duration and price in mono, a "Special $25 until Nov 30" line when set. Edit page: name, duration, price, cleaning buffer (0 by default), per-Barber price and duration, special price with an end-date picker, archive (gray, confirm). Empty: "Add your first Service." + "Add Service".
4. **Hours & closed days.** Pick a Barber, edit their weekly hours with an optional break; Shop closed days as a dated list with add/remove. Saving a closed day over Bookings shows a neutral notice listing those Bookings and a link to Today to move or cancel them; nothing is saved until they're cleared.
5. **Barbers.** Up to 6: photo or initials, name, email, "Invite sent" when they haven't signed in. "Invite Barber" (name + email). At 6, the button is replaced by "A Shop can have up to 6 Barbers." Remove (gray, confirm): refused with a clear reason while they have upcoming Bookings.
6. **Booking rules.** The cancellation cutoff (1 hour by default). When it's set over 2 hours, a neutral warning: the reminder text goes out 2 hours before, so Clients couldn't cancel from it (`REMINDER_AFTER_CUTOFF`).
7. **Blocklist.** Blocked phone numbers in mono with "Unblock"; add a number. Empty: "No blocked numbers." + "Block a number".
8. **Online payments.** Status from the payment provider: Not connected / Setup unfinished / Connected. One action: "Connect payments" or "Finish setup" opening the provider's hosted sign-up. Plain words: the fee is charged to the Shop's own account; until connected, Clients only see "Pay at the Shop".
9. **Booking link & QR.** The `/b/<shop>` link with Copy and Share, and a counter QR code with "Print" (a print-friendly page: Shop name, QR, the short link, "Book your next cut" in EN and ES).
10. **Export clients.** One sentence on what's in the file, and "Download CSV".

Errors in general: neutral notices next to the save button, input kept. Saves confirm with a short inline "Saved", not a toast stack.

EN/ES: the signed-in person's language. Week labels, day names, "h"/"min" and number formats follow the language; every setting's help line exists in both, written fresh.
