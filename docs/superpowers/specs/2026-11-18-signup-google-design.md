# Log in, Sign up and Google sign-in: design

Date: 2026-11-18. Size: a project.

## Intent

The landing page has no way in. A Shop Owner who wants Barber Master has to "Talk to us" and wait for our team to create their Shop by hand. We want Owners to **sign up themselves** (with Google or an email link), get a working Shop in a minute, and **log in** later from the landing. This must never create duplicate accounts or duplicate Shops.

## Goals

- **Landing nav buttons:** "Log in" and "Sign up" in English; "Log in" and "Crear cuenta" in Spanish (the user's words).
- **One sign-in card** at `/login` with two tabs (Log in / Sign up). Each tab offers **Continue with Google**, or an email field that sends a sign-in link. The card follows the user's pasted component, restyled to DESIGN.md.
- **Shop setup screen** (`/setup`): a signed-in person with no Shop sets up their own. They give the Shop name, their name, the Shop phone, the address and the haircut price. That creates a bookable Shop on the free month, on the Free plan. They land on Today, and our team gets an email.
- **No duplicates:**
  - one login per email address;
  - one Shop per login;
  - a double tap, a second tab or a retry returns the same Shop;
  - every Shop link is unique.

## Non-goals

- Passwords, "Forgot password", or Apple and Facebook sign-in.
- Billing at sign-up. It stays by hand, and the free month is the database default.
- A multi-step setup wizard. Barbers, Services and hours are already editable in Settings.
- Shops waiting for admin approval.

## Anti-goals

- A sign-in path that creates a second login for the same email.
- A setup that can leave half a Shop behind.
- Making the landing page dynamic, which would slow it on phones.

## Approaches (A chosen by the user)

- **A (chosen):** one `/login` card with tabs, followed by a one-screen setup. It's simple, fits the existing magic-link flow, and the landing stays static.
- **B:** same as A, but new Shops wait for our approval. It's safer against junk, but nobody can use the app right away, which goes against the goal.
- **C:** sign-in in a pop-up on the landing. It makes the landing dynamic and has no real benefit over A.

## How it works

**Accounts (one per email)**
- Supabase keeps one login per email.
- Google and email-link sign-ins for the same verified email are linked to the same login automatically.
- **Sign up tab:** the email link may create the login (`shouldCreateUser: true`). The form is behind Turnstile.
- **Log in tab:** the email link never creates a login (`shouldCreateUser: false`). It always says "sent", so it doesn't reveal who has an account.
- **Google:** a server action calls `signInWithOAuth({ provider: "google" })` and redirects to Google. Google sends the person back to the existing `/auth/callback`, which exchanges the code.
- Either way the person lands on `/app/day`.

**Routing**
- **No Shop:** `StaffShell` sends a signed-in person who has no membership to `/setup`. This doesn't apply to a retired Barber login or a Platform admin.
- **Already has a Shop:** `/setup` sends them to `/app/day`.
- **Not signed in:** `/setup` sends them to `/login?mode=signup`.
- `/setup` is added to the proxy matcher so the session refreshes there.

**Shop creation (`src/server/signup/`, `createSignup(sql)`)**
- **Transaction:** `createOwnShop` runs in a single transaction.
  - It first takes a per-login advisory lock, `pg_advisory_xact_lock(hashtextextended('signup:' || user_id, 0))`.
  - Then it checks `shop_members` for that login. If there is any row, it creates nothing:
    - an Owner's own Shop is returned (`created: false`);
    - a Barber membership is refused (`ALREADY_MEMBER`).
- **Shared insert:** the Shop rows are written by the same insert as the Platform admin's `createShop`, pulled out as `insertShop(tx, …)`. The two paths can't drift apart.
- **Shop link (slug):**
  - it's made from the Shop name, with accents folded and non-letters turned into dashes;
  - it's 3–40 characters, with `shop` as the fallback;
  - a number is added if the link is taken (`-2`, `-3`, …);
  - the existing `shops_slug_key` unique constraint is the backstop, and a race on it retries with the next number.
- **Starting values (the Owner edits them in Settings):**
  - the Owner is the first Barber, named as they typed;
  - one Service, "Haircut" / "Corte", 30 minutes, at the price they entered;
  - hours Monday to Saturday, 9:00–19:00; closed Sunday;
  - `manual_booking_minutes` 0, so we don't invent a number.
- **Our team's email:** after commit, the Shop is passed to `leads().submit` (saved and emailed to Platform admins, retried daily). It's best effort: a failure there never fails the sign-up.
- **No database migration.** The lock and the in-transaction check are the guarantee for self sign-up. Platform admins can still give one Owner several Shops on purpose.

**Bot protection:** Turnstile on the Sign up email form and on the setup form, using the existing `verifyTurnstile`. Google needs none.

## Design

- **Look:** the card adapts the pasted component (dark card, title, fields with icons, stacked buttons) to DESIGN.md:
  - the `.landing` near-black theme, Geist, a hairline border and a soft inset field;
  - the white pill for the main action and a quiet raised pill for Google, with the official multicolor "G";
  - a segmented control for the tabs.
- **No red** (red is only for live signals), **no hover scale**, and no password fields.
- **Nav:** "Log in" is a text link next to the language switch. "Sign up / Crear cuenta" replaces "Talk to us" as the metal pill; "Talk to us" stays in the hero and the contact section. On phones, both go at the bottom of the menu card.

## Left to the builder

Exact copy (EN and ES), the error messages, and the setup screen's layout within the login page's frame.

## Needs the user (not code)

- **Google provider:** done in the Supabase dashboard.
- **Redirect allow list:** Supabase must allow `https://citrus-system.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`.
- **Email/password sign-up:** turn it off in Supabase if it's on.
- **Sign-up emails to strangers:** they need Supabase's mail sender to reach any address. If it is Resend without a verified domain, only Google sign-up works for outsiders.
- **Real Turnstile keys:** still open (audit finding #1).
