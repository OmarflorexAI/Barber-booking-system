---
version: 1
slug: "src-app-admin"
primary_target: "src/app/admin/page.tsx"
related_targets: ["src/app/admin"]
---

# Platform admin panel (`/admin`)

Scope: our team's panel: **Shops** (list, create, detail), **Failures**, **Access log**. Mode: Operate. Mission U4 (planned routes; not built yet; a short grill is still due at U4). The backend is built: `src/server/platform-admin` (B6).

Audience: Platform admins (our small team: support and the person doing Shop visits). Desktop-first at a laptop, usable on a phone at a Shop's counter during an install. Action: set up a Shop in minutes, keep texting and billing status straight, see and retry failures before a Shop notices, and open support access with a logged reason. Proof: the real rows.

Constraints: Platform admin only (`requirePlatformAdmin`). Every support access needs a reason and is logged (who, when, why); client import is logged as support access. Billing is by hand: free month / paid / overdue. SMS registration: approved turns texting on, any other status turns it off. Cancelling a Shop closes its booking page at once; everything is deleted 30 days later. Top nav **Shops · Failures · Access log**, a switch to `/app` when also Shop staff, **Sign out** in the top nav. After sign-in a Platform admin lands here. Global rules: `DESIGN.md` → "App (Operate mode)"; decisions: `progress.md` → "G grill answers".

## Direction contract

THESIS: A quiet operations ledger: one sortable table of Shops whose columns answer "is this Shop working and paying" at a glance, and a Failures queue that is either empty or tells you exactly what to retry. It refuses the category default of an analytics home with charts, MRR tiles and a noisy notification bell.

OWN-WORLD: the app ramp (light by default, follows the phone), Hanken Grotesk, JetBrains Mono for counts, dates and phone numbers. A full-width table with hairline rows at 56px, sortable headers, gray status tags (Texting: Approved / Pending / Not registered; Billing: Free month / Paid / Overdue; Status: Active / Cancelled), detail pages as stacked `--surface` sections. No red: an overdue or failed state is a gray tag with clear words, not a color alarm.

STORY: The admin opens `/admin`, scans the Shops table for anything not approved, not paid or quiet this week, opens a Shop to fix it (texting status, billing, minutes per booking, a client import), checks Failures and retries what's stuck, and every time they look inside a Shop, the reason is on record.

FIRST VIEWPORT: Desktop, 1440px. Top nav: wordmark and "Admin" left; **Shops · Failures · Access log** centered or left after it; the `/app` switch, EN/ES toggle, theme switch and **Sign out** right. Page header "Shops" with "Create Shop" (primary pill) right. The table: Shop name (and slug muted), Status, Texting, Billing, Barbers (n of 6), Bookings last 7 days (mono), Minutes per booking (mono). A Failures count appears in the nav as a plain number when it isn't zero. Phone: the same nav wraps; the table becomes stacked rows with the name and the three status tags.

FORM: Operate, a standard admin console (top nav, data table, detail pages, forms), built from standard web controls. Code-led. seed: none (direction pinned by the user in the G grill; no roll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Screens

1. **Shops list.** As in the first viewport, sortable by each column, with a text filter by name.
   - Loading: skeleton table rows. Empty: "No Shops yet." + "Create Shop".
2. **Create Shop.** One form: Shop name and link name (slug), phone, Owner (name, email, cuts hair yes/no), up to 6 Barbers, Services (name, duration, price, buffer), starting hours for everyone, minutes per manual booking. Checked before saving (`checkNewShop`): errors sit next to their fields, input kept; "link name taken" is its own clear message. Success opens the Shop's detail.
3. **Shop detail.** Sections:
   - **Texting (SMS registration)** status with a change control.
   - **Billing**: Free month / Paid / Overdue.
   - **Minutes per booking** (used for time saved).
   - **Client import (CSV)**: upload, then a result: imported, already there, and rejected rows listed by line number with the reason. Logged as support access by the backend.
   - **Support access**: "Open support access" asks for a reason, then logs it.
   - **Cancel Shop** (gray, confirm stating that the booking page closes now and data is deleted in 30 days, with the date), **Reactivate** (cancelled Shops only), **Export clients** (CSV; asks for a reason and logs it as support access).
4. **Failures.** Failed texts, alerts and refunds across Shops: when, Shop, kind, recipient (masked), last error in plain words, tries. Action per row: "Retry". Empty: "Nothing has failed." (no action needed). Refund failures are listed first.
5. **Access log.** Who, when, which Shop, why, newest first, filter by Shop. Empty: "No support access yet."

Errors in general: neutral notices next to the action, saying what to do; input kept. Never red.

EN/ES: the signed-in person's language, like the rest of the app; every label, status tag and confirm in both. Data (Shop names, error text from providers) is shown as stored.
