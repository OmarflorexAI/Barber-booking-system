---
version: 1
slug: "src-app-m-token"
primary_target: "src/app/m/[token]/page.tsx"
related_targets: ["src/app/m/[token]/manage-actions.tsx", "src/app/m/[token]/actions.ts"]
---

# Client manage booking (`/m/<token>`)

Scope: the page a Client opens from the signed link in their confirmation or reminder text to see, change or cancel one Booking. Mode: Operate. Mission U1. **Restyle**, not rebuild: the logic and e2e tests are kept.

Audience: the same Clients as `/b`, now on the day or the day before, often opening the link from a text with one hand. Action: confirm they're booked, or change the time, or cancel and know what happens to their money. Proof: the Booking's own facts.

Constraints: no account; the signed token is the only key. The engine decides the rules: cancel or change only before the Shop's cutoff (1 hour by default); a Client cancel before the cutoff is refunded in full automatically; after the cutoff, "call the Shop"; a moved Booking keeps its payment; refunds are always in full. `shops.phone` is used for tap-to-call. No refund timing promises beyond what the provider guarantees. Global rules: `DESIGN.md` → "App (Operate mode)"; decisions: `progress.md` → "G grill answers".

## Direction contract

THESIS: One card that answers "am I still booked, and what happens to my money", with Change time and Cancel as the only two actions. It refuses the category default of a login wall, a support chat bubble and a page of policy text.

OWN-WORLD: the app ramp (light by default, follows the phone), Hanken Grotesk, JetBrains Mono for the time and price. One `--surface` summary card with 16px corners on `--paper`, a status line at its top, the black (light) / white (dark) pill for Change time and a gray pill for Cancel. Red only for the booked check on an active Booking. The paid tag is gray with a card icon.

STORY: The Client opens the link, sees at once that the Booking stands (who, what, when, how much, paid or not), and either leaves reassured, picks a new time that keeps their payment, or cancels and reads in the confirm whether a refund is coming.

FIRST VIEWPORT: Phone, 390px. Header: the Shop's name left; EN/ES toggle and theme switch right. A status line with the red check: "You're booked". The summary card: Barber (photo or initials) and name, Service, the day and time in mono at 1.5rem, price in mono, and "Paid online" (gray, card icon) or "Pay at the Shop". Below it, muted: "You can change or cancel until 9:30 AM (1 hour before)." At the bottom within thumb reach: "Change time" (primary pill) and "Cancel booking" (gray pill). The Shop's phone as a tap-to-call link under them.

FORM: Operate, a standard booking-detail page (summary card, two actions, a confirm sheet), built from standard web controls. Code-led. seed: none (direction pinned by the user in the G grill; no roll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Screens

1. **Summary (active Booking).** As in the first viewport. Loading: a skeleton of the card and two buttons.
2. **Change time.** The same time picker as `/b` step 3, for the same Barber and Service; the old time is shown as "Now: Thu 10:30". Primary: "Move to 11:15". Done returns to the Summary with the new time and a short "Time changed" line; the payment is unchanged and says so.
   - Error: the new time was just taken: neutral notice, pick another, the old Booking untouched.
3. **Cancel confirm** (a bottom sheet). Says plainly what happens: "You'll get a full refund of $35 to your card." or "Nothing to refund: you were paying at the Shop." Primary: "Cancel booking"; secondary: "Keep it".
4. **Cancelled.** Status "Cancelled", the summary muted, and "Book again" (link to `/b/<shop>`). If a refund was made: "Refunded $35 to your card." If the refund is still being processed, say that plainly instead.
5. **Too late to change.** Past the cutoff: the summary stays, the two buttons are replaced by "It's too late to change this online. Please call the Shop." + a tap-to-call button with the Shop's number.
6. **Past.** "This booking has passed." + "Book again".
7. **Awaiting payment.** A Booking still in its 10-minute hold: "Waiting for your payment", with the held time. If the hold expired: "This time is no longer held. Pick a time again." + link to `/b/<shop>`.
8. **Bad or expired link.** A neutral bilingual page: "This link doesn't work anymore." with no Shop data shown.

Errors in general: a neutral notice next to the button that failed, saying what to do (try again, or call the Shop). Never red.

EN/ES: the page starts in the phone's language with the toggle; `<html lang>` follows it. Day names, months and the time format follow the language. Refund and cutoff sentences are written fresh in Spanish, not word-for-word.
