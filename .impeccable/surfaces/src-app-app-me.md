---
version: 1
slug: "src-app-app-me"
primary_target: "src/app/app/me/page.tsx"
related_targets: ["src/app/app/me"]
---

# Barber Me (`/app/me`)

Scope: the Barber's **Me** tab (also shown to an Owner who cuts hair): Profile, Gallery, Hours, Alerts, and Sign out at the bottom. Mode: Operate. Mission U3b (planned route; not built yet).

Audience: Barbers on their phones, proud of their work, not technical. Action: make their profile and gallery look good to Clients, set when they work, and connect alerts once. Proof: their own photos.

Constraints: a Barber edits only their own profile, gallery, hours and days off; they can't change prices or see other Barbers. **Photos upload to Supabase Storage, resized on the phone first**; initials when there's no photo. Gallery: up to 6 photos; the backend allows 0, the screen asks for at least 3. A day off over existing Bookings is refused until they're moved or cancelled. **Telegram** is built now against the log-only stand-in and tested live when the keys arrive; until linked, alerts go by email. Global rules: `DESIGN.md` → "App (Operate mode)"; decisions: `progress.md` → "G grill answers".

## Direction contract

THESIS: The Barber's chair card: how Clients will see them (photo, name, specialties, best work) on top, and the practical switches (hours, alerts) below, so the screen reads as "this is me" before it reads as settings. It refuses the category default of an account-settings form with a tiny avatar circle and a password field.

OWN-WORLD: the app ramp (light by default, follows the phone), Hanken Grotesk, JetBrains Mono for hours ("9:00–18:00") and counts ("4 of 6 photos"). A preview card on `--surface` with 16px corners showing the profile as Clients see it, a 3-column photo grid with 16px-cornered tiles, hairline-ruled 56px rows for Hours and Alerts with their current value muted at the right. No red.

STORY: The Barber opens Me, sees their profile as a Client would, adds a photo and three cuts they're proud of, sets their week and a day off, connects Telegram with one tap, and knows where Sign out is.

FIRST VIEWPORT: Phone, 390px. Header: "Me" left; EN/ES toggle and theme switch right. The profile card: photo (or an initials disc) at 72px, name semibold, specialties muted, bio in two lines, "Edit profile" (outlined pill). Below it "Gallery · 2 of 6" with a 3-column grid and an "Add photo" tile, plus a muted line "Add at least 3 photos so Clients can see your work." Then rows: **Hours** ("Mon–Sat, 9:00–18:00"), **Days off** ("None coming up"), **Alerts** ("Email" or "Telegram connected"). **Sign out** at the very bottom. Bottom tabs **Day · Me**.

FORM: Operate, a standard profile page with a media grid and settings rows, built from standard web controls and the phone's own photo picker. Code-led. seed: none (direction pinned by the user in the G grill; no roll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Screens

1. **Me (overview).** As in the first viewport.
   - Loading: skeleton card, grid and rows.
2. **Edit profile.** Photo (take or choose; resized on the phone, then uploaded, with a progress state on the tile), name, bio (short, with a character count), specialties (comma or chip input). Primary: "Save".
   - Errors: upload failed or file too large: neutral notice on the tile with "Try again"; the rest of the form is kept.
3. **Gallery.** 3 to 6 photos: add, remove (gray, confirm), reorder. Under 3: the line asking for at least 3. At 6: "Add photo" disappears with "6 of 6". Empty: "Add photos of your best cuts." + "Add photo".
4. **Hours.** Each weekday: on/off, start and end, optional break; times in mono. "Save" applies to future Bookings only and says so.
5. **Days off.** Upcoming days off with remove; "Add day off" (date picker). A day over existing Bookings is refused with a neutral notice listing them and a link to Day to move or cancel them.
6. **Alerts.** Not linked: "Alerts go to your email (carlos@…)." + "Connect Telegram" (a link that opens Telegram on the phone, and a QR code to scan from another device). Linked: "Telegram connected" + "Disconnect" (gray). While waiting for the link: "Waiting for Telegram…" that updates when connected. Until the Telegram keys are live, this works against the stand-in; the copy makes no promise about delivery speed.
7. **Sign out** at the bottom of Me; for an Owner who cuts hair it also stays at the bottom of Settings.

Errors in general: neutral notices next to the action, input kept. Never red.

EN/ES: the signed-in person's language. Weekday names, time formats and every hint line in both languages; the Telegram steps are written fresh in Spanish.
