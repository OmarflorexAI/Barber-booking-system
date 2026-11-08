# Barbershop Booking System PRD

Nov 6, 2026 · @Omar Flores

Barber Booking (working title) lets a client book a barbershop from a link, pay online or in person, and gives the barber a phone alert instead of a phone call. Version 1 serves 3 pilot shops in the Bronx and upper Manhattan.

## Problem Statement

Barbershops in the Bronx and upper Manhattan take bookings by phone call, WhatsApp, Instagram message and a paper notebook. Every booking interrupts a barber who is cutting hair. Clients who do not show up leave empty chairs. Owners cannot say how many bookings they get in a week or how much time scheduling costs them.

Booking tools already exist and cost a four-barber shop from $0 to about $90 a month (prices checked in November 2026). We do not compete on price. Our bet is that shops will pay for a setup done for them, in Spanish and English, with someone who answers when something breaks. The shop visits must confirm whether that bet is true.

## Solution

Each shop gets its own booking link and a QR code for the counter. A client opens it on a phone, picks a service, a barber (or any available barber) and a slot, types a name and phone number, and chooses to pay online or in person. There is no account and no app.

The barber gets an alert on Telegram or by email with a link to their day, so nobody has to answer calls to know the schedule. The client gets a confirmation text and a reminder 2 hours before, both with a link to cancel or change the time. The owner sees bookings per week and time saved.

We set up every shop ourselves. A platform admin creates the shop, imports the client list, registers the shop for text messages and trains the owner. The first month is free and billing is by hand after that.

## User Stories

### Client booking

1. As a Client, I want to open a Shop's booking link on my phone without installing anything or creating an account, so that I can book in under a minute.
2. As a Client, I want to scan a QR code at the Shop counter that opens the same booking page, so that I can book my next visit before I leave.
3. As a Client, I want to see each Barber's photo, bio, specialties and a gallery of 3 to 6 photos, so that I can choose the Barber whose work I like.
4. As a Client, I want to see every Service with its duration and price, so that I know what I am paying for and how long it takes.
5. As a Client, I want to see special prices marked clearly with their end date, so that I can book before the deal expires.
6. As a Client, I want to choose a specific Barber or "any available", so that I can either keep my Barber or get the earliest time.
7. As a Client, I want to see only Slots that are really free, from 30 minutes from now up to 30 days ahead, so that I never pick a time that does not exist.
8. As a Client, I want times shown in the Shop's local time, so that I never arrive at the wrong hour.
9. As a Client, I want to give only my name and phone number, so that booking stays fast.
10. As a Client, I want to choose to pay online or in person, so that I can pay the way I prefer.
11. As a Client, I want to see the refund and cancellation rule before I pay, so that I know what happens to my money.
12. As a Client, I want to pay the full Service price by card on a secure page, so that I do not have to carry cash.
13. As a Client, I want the Shop to never store my card number, so that my card stays safe.
14. As a Client, I want to see a confirmation screen with the Barber, Service, time and price, so that I know the Booking worked.
15. As a Client, I want to see a clear message when a time was just taken by someone else and pick another, so that I do not end up double booked.
16. As a Client, I want to use the page in Spanish or English, starting in my phone's language with a toggle, so that I understand every step.
17. As a Client, I want to see only "pay in person" when the Shop has not connected online payments, so that I am not offered something that does not work.
18. As a Client, I want to pay my tip in person, so that I can tip the Barber directly.

### Client texts, changes and refunds

19. As a Client, I want a confirmation text right after I book, so that I have the details in my messages.
20. As a Client, I want a reminder text 2 hours before my Booking, so that I do not forget.
21. As a Client, I want both texts to include a link to cancel or change my time, so that I never need to call the Shop.
22. As a Client, I want to cancel up to 1 hour before my Booking (or the Shop's own cutoff), so that I have a fair window to change plans.
23. As a Client, I want an automatic full refund when I cancel before the cutoff, so that I am not out of money for a visit I did not make.
24. As a Client, I want to change my time through the same link, so that I keep my Booking and my payment.
25. As a Client, I want to be told to call the Shop when the cutoff has passed, so that I know my options.
26. As a Client, I want an automatic full refund and a text if the Barber or Shop cancels on me, so that I am not penalized for their change.
27. As a Client, I want a clear consent line before I get texts and a STOP option in every text, so that I stay in control of my messages.
28. As a Client, I want my phone number used only by the Shop I booked with, so that my data is not shared with other Shops.

### Owner setup and daily control

29. As an Owner, I want the platform team to set up my Shop for me, so that I do not need technical skills.
30. As an Owner, I want to connect my own Stripe account through a hosted sign-up, so that online payments go straight to me.
31. As an Owner, I want the Stripe fee charged to my account and no platform fee in version 1, so that the cost is simple to understand.
32. As an Owner, I want to add my Barbers and invite them by email, so that each one can use the system on their phone.
33. As an Owner, I want to set Services, durations and prices for each Barber, so that the system matches how my Shop works.
34. As an Owner, I want to set a special price on a Service with an end date, so that I can run promotions without a calculator.
35. As an Owner, I want to set an optional cleaning buffer per Service, so that Barbers get time to reset their chair.
36. As an Owner, I want to set Shop-wide closed days such as holidays, so that nobody can book on them.
37. As an Owner, I want to edit any Barber's weekly hours, so that I can fix a schedule when a Barber forgets.
38. As an Owner, I want to change the cancellation cutoff for my Shop, so that the rule fits how we work.
39. As an Owner, I want to see every Barber's calendar in one view, so that I know what is happening in my Shop.
40. As an Owner, I want to see which Bookings were paid online, so that I know what money is already collected.
41. As an Owner, I want to be a Barber in my own Shop too, so that I have one login for both roles.
42. As an Owner, I want to remove a Barber who leaves, so that Clients can no longer book with them.
43. As an Owner, I want to block a phone number from booking, so that I can stop repeat troublemakers.
44. As an Owner, I want to refund a Client by hand in Stripe after the cutoff when I choose, so that I can make exceptions.
45. As an Owner, I want my existing client list imported from a spreadsheet, so that I do not start from zero.
46. As an Owner, I want to log in with an email link and no password, so that I never get locked out.

### Owner results

47. As an Owner, I want a dashboard with Bookings per week, so that I can see whether the system is being used.
48. As an Owner, I want to see time saved each week, so that I understand the value I get for what I pay.
49. As an Owner, I want a daily email with yesterday's Bookings and time saved, so that I get the picture without opening the app.
50. As an Owner, I want to export my Client data as a spreadsheet at any time, so that my data is always mine.
51. As an Owner, I want everything deleted 30 days after I cancel, so that nothing about my Clients lingers.

### Barber daily use

52. As a Barber, I want to log in with an email link and stay logged in on my phone, so that I can check my day in seconds.
53. As a Barber, I want to connect Telegram once with a link or QR code, so that alerts reach me without extra setup.
54. As a Barber, I want a Telegram alert for each new Booking, so that I never have to answer a call to learn my schedule.
55. As a Barber, I want alerts for cancellations, time changes and online payments too, so that my day is always up to date.
56. As a Barber, I want each alert to link to my day view, so that I can see the full picture in one tap.
57. As a Barber, I want an email alert if Telegram is not connected or fails, so that I still hear about every change.
58. As a Barber, I want to see my day with each Client's name, phone, Service and paid status, so that I know who is coming and who has paid.
59. As a Barber, I want to mark a Client as arrived or as a no-show, so that my records stay accurate.
60. As a Barber, I want a walk-in button that logs the Service and time and blocks that time on my calendar, so that online Clients cannot book over a walk-in.
61. As a Barber, I want to cancel or move one of my Bookings, with the Client told by text, so that I can handle emergencies without calling.

### Barber profile and schedule

62. As a Barber, I want to set my weekly hours with an optional break, so that Clients only book when I work.
63. As a Barber, I want to add one-off days off, so that I can take time away without telling every Client.
64. As a Barber, I want a day off over existing Bookings to be blocked until I cancel or move them, so that I never create a conflict by accident.
65. As a Barber, I want affected Clients to get a text when I cancel or move their Booking, so that nobody shows up to a closed chair.
66. As a Barber, I want to edit my own photo, bio, specialties and gallery, so that my profile shows my best work.
67. As a Barber, I want to see my own Clients' names and phones, so that I can reach one if needed.
68. As a Barber, I want to be unable to change prices or see other Barbers' calendars and revenue, so that the Owner keeps control of the business side.

### Platform admin

69. As a Platform admin, I want an admin panel to create a Shop with its Owner, Barbers and Services, so that installs take minutes.
70. As a Platform admin, I want to import a Shop's client list from a spreadsheet, so that the Shop starts with real data.
71. As a Platform admin, I want to register each Shop's text messaging identity when the Shop accepts, so that texts are approved by install day.
72. As a Platform admin, I want to see the registration status for each Shop, so that I know whether texts can go out.
73. As a Platform admin, I want to record the minutes the Shop spends per manual booking at the install visit, so that time saved is calculated from their own number.
74. As a Platform admin, I want to mark which Shops are in the free month and which have paid, so that I can bill by hand.
75. As a Platform admin, I want support access to a Shop that is logged with who, when and why, so that I can fix problems without breaking trust.
76. As a Platform admin, I want to export and delete a cancelled Shop's data on schedule, so that we keep our promise to the Owner.
77. As a Platform admin, I want to see failed texts, failed alerts and failed refunds in one place, so that I fix them before a Shop notices.

### Protection and system behavior

78. As the system, I want bot protection on the booking form, so that automated traffic cannot fill a Shop's calendar.
79. As the system, I want to allow at most 2 active unpaid Bookings per phone number, so that one person cannot hold the calendar hostage.
80. As the system, I want the database to refuse two Bookings for the same Barber and Slot, so that double booking is impossible even under heavy load.
81. As the system, I want to skip the 2-hour reminder when a Booking is made less than 2 hours ahead, so that Clients do not get a reminder right after a confirmation.
82. As the system, I want to send each reminder once even when the scheduled job runs twice, so that Clients never get duplicates.
83. As the system, I want to store times in UTC and show them in the New York time zone, with correct behavior around daylight saving changes, so that no Booking shifts by an hour.
84. As the system, I want to handle repeated payment notifications from Stripe safely, so that a retry never creates a second charge record or refund.
85. As the system, I want each Shop's data kept apart from every other Shop's, so that no Owner or Barber can see another Shop.
86. As the system, I want to tell the Owner when a refund fails, so that a Client is never left unpaid without anyone knowing.

## Implementation Decisions

### Architecture and stack

- One multi-tenant web application serves every Shop. A Shop is a tenant, and its data is separated from all others at the database level, not only in application code.
- Web app on Next.js hosted on Vercel. Database and authentication on Supabase Postgres with row-level security per Shop.
- Payments on Stripe Connect. Texts on Twilio. Email on Resend. Barber alerts on the Telegram Bot API. Errors tracked in Sentry. A scheduled job sends reminders and daily summaries.
- No GoHighLevel and no other all-in-one tool. The product is built custom so that we own the roadmap and the margin.
- Omar builds with Claude Code. His father leads shop visits and sales.

### Modules

- **Booking engine.** The deep module. It owns availability, creating a Booking, cancelling, rescheduling, logging a Walk-in and scheduling reminders. It exposes a small set of operations and hides slot math, buffers, time zones and conflict handling. Everything else calls it.
- **Payments.** Creates the charge on the Shop's own Stripe account, records the result and issues refunds. It reports to the booking engine and never decides Booking rules.
- **Client messaging.** Sends confirmation and reminder texts, handles STOP and keeps a send log per Shop.
- **Barber and Owner alerts.** Sends Telegram messages with an email fallback, and builds the daily Owner summary.
- **Identity and access.** Email magic-link login, persistent sessions, the three roles and the support access log.
- **Shop administration.** Admin panel for Platform admins: create a Shop, import clients, record SMS registration status, set the Shop's manual-booking minutes.
- **Reporting.** Computes Bookings per week and time saved for the Owner dashboard and the daily email.
- **Public booking page.** The Client-facing flow in Spanish and English. It holds no business rules and talks only to the booking engine.

### Booking rules

- One Service per Booking. Combos are sold as separate Services with their own duration and price.
- The Slot grid is 15 minutes. Bookings can be made up to 30 days ahead and at least 30 minutes ahead. Each Service may have a cleaning buffer, 0 minutes by default.
- "Any available Barber" assigns a free Barber at booking time. Proposed rule: the free Barber with the fewest Bookings that day (to confirm, see Further Notes).
- The database enforces that one Barber cannot have two overlapping Bookings. When two Clients race for one Slot, one succeeds and the other is told to pick another time.
- A Walk-in is logged with Barber, Service and time and blocks that time like a Booking.
- A Barber's day off, or a Shop closed day, cannot be saved over existing Bookings until those Bookings are cancelled or moved. Affected Clients are texted.
- Rescheduling keeps the original payment (to confirm).
- Clients are identified by name and phone only. There is no SMS verification code. Protection comes from bot checks on the form, a limit of 2 active unpaid Bookings per phone number and an Owner blocklist.
- A special price is a Service price with an end date. There are no caps and no approval steps.

### Payments and refunds

- Online payment is a full-price charge at booking, made directly on the Shop's own Stripe account (a direct charge). The Stripe fee is paid by the Shop. The platform takes no fee in version 1.
- Each Shop connects Stripe through Stripe-hosted onboarding. Until it does, only "pay in person" is shown.
- Card details never touch our systems.
- Client cancels before the cutoff: automatic full refund. Barber or Shop cancels: automatic full refund plus a text. After the cutoff: no automatic refund, and the Owner can refund by hand in Stripe. A paid no-show: the Shop keeps the money.
- Stripe does not return its processing fee on refunds (to confirm in current Stripe documentation).
- Tips are paid in person and are not part of the charge.
- Payment events from Stripe are processed so that a repeated event has no second effect.

### Texts and compliance

- Each Client gets a confirmation text at booking and one reminder 2 hours before. The reminder is skipped when the Booking is made less than 2 hours ahead.
- Both texts include a link to cancel or change the time. The cancellation cutoff is 1 hour before the Booking by default and the Shop can adjust it.
- The booking form shows a consent line, and every text includes STOP instructions.
- US carrier rules require each Shop to be registered as its own sender (brand and campaign), using a separate messaging subaccount per Shop. Platform admins register the Shop the day it accepts, before install day. Approval times are not published, so we plan for waiting.
- A Shop without an EIN may use the sole-proprietor path, which has lower sending limits (to confirm).

### Barber and Owner alerts

- Barbers get a Telegram message for a new Booking, a cancellation, a time change and an online payment. Each message links to the Barber's day view. There are no action buttons inside Telegram.
- A Telegram bot cannot message a person first, so each Barber connects once through a link or QR code. Until then, and whenever Telegram fails, alerts go by email.
- The Owner receives a daily email with yesterday's Bookings and time saved.
- WhatsApp alerts are a later addition.

### Roles and access

- Owner: configures the Shop, Services, prices, hours for all Barbers and the cutoff. An Owner may also be a Barber.
- Barber: edits own hours, profile and gallery; marks arrived or no-show; logs Walk-ins; sees the names and phones of their own Clients. Cannot change prices and cannot see other calendars or revenue.
- Platform admin: creates Shops, imports client lists, handles SMS registration and gives support. Every support access to a Shop is recorded with who, when and why.
- Login is by email magic link with a persistent session. There are no passwords.

### Time and language

- All Shops are in the America/New\_York time zone. Times are stored in UTC and shown in local time, including across daylight saving changes.
- The Client page defaults to the phone's language with a Spanish and English toggle. Dashboards use the signed-in user's language.

### Onboarding, billing and data

- Onboarding is done for the Shop. A Platform admin creates the Shop, imports the client list from a CSV and records the Shop's minutes spent per manual booking from the install visit. Google Calendar sync comes later.
- Time saved equals online Bookings multiplied by the Shop's reported minutes per manual booking. It is shown weekly on the Owner dashboard and in the daily email.
- No-show status is stored as data and is not a success metric.
- There is no billing system in version 1. The first month is free, then the Shop pays by hand (Zelle, cash or invoice). Price test: $39 or $59 a month. Stripe subscriptions come later.
- Client data belongs to the Shop. When a Shop cancels, it can export a CSV and everything is deleted after 30 days.
- Success metrics: Bookings per week per Shop, and time saved.

## Testing Decisions

A good test checks what a Client, Barber or Owner can observe, not how the code is built inside. A test that breaks when we rename an internal function but behavior is unchanged is a bad test.

### What we test

- **The booking engine, as one seam.** Availability, creating a Booking, cancelling, rescheduling, logging a Walk-in and scheduling reminders are tested through the engine's public operations. These tests run against a real Postgres database, because the no-double-booking guarantee lives in the database and a fake would hide the very bug we care about. Stripe, Twilio, Telegram and Resend are replaced with fakes at the edge, so tests can check that the right refund, text or alert was requested without calling real services.
- **Cases the engine tests must cover:** buffers and the 15-minute grid; the 30-minute minimum notice and 30-day limit; "any available Barber" assignment; breaks, days off and Shop closed days; a day off blocked by existing Bookings; the cancellation cutoff on both sides; automatic refunds for each cancellation path; reminders skipped for late Bookings and never sent twice; the 2 unpaid Bookings per phone limit; blocked phone numbers; and daylight saving changes in March and November.
- **Three browser journeys, end to end:**
  1. A Client opens the Shop link, books a Service and pays online.
  2. A Barber's alert arrives and the Client cancels from the text link and is refunded.
  3. Two Clients race for the same Slot, and exactly one succeeds while the other is offered another time.

### What we do not test heavily

- Look and feel of every screen. Journeys cover the paths that matter.
- The inside of Stripe, Twilio, Telegram and Resend. We test our use of them with fakes and check real behavior by hand in their test modes before each Shop goes live.

### Prior art

There is none. This is a new codebase, so the test setup is part of the first build.

## Out of Scope

These are not in version 1. Some come later; some may never.

- A marketplace or directory where Clients discover Shops.
- Partial deposits. Online payment is the full price or nothing.
- Online tips. Tips are paid in person.
- WhatsApp alerts or texts.
- A walk-in queue with a QR code or live wait time. Version 1 only has the walk-in button. The full design comes later.
- Google Calendar sync.
- Automated billing to Shops. Version 1 bills by hand.
- Salons, garages and any business that is not a barbershop.
- A native iOS or Android app.
- Loyalty programs and gift cards.
- Inventory, payroll and commissions.
- Shops with more than one location.
- A custom domain for each Shop.
- An AI assistant.
- Shops outside the New York time zone.
- Clients with accounts, passwords or booking history screens.

## Further Notes

### Glossary

- **Shop:** one barbershop using the product. It is the tenant that owns its data.
- **Owner:** the person who runs the Shop and configures it. May also be a Barber.
- **Barber:** a person who cuts hair and has a calendar, Services and prices.
- **Client:** a person who books a haircut. Clients have no accounts.
- **Service:** something a Client can book, with a duration and a price.
- **Booking:** a Client's reservation with one Barber for one Service. We never say "appointment".
- **Slot:** a 15-minute block on a Barber's calendar.
- **Walk-in:** a Client who arrives without a Booking and is logged by the Barber.
- **Platform admin:** our team, who set up and support Shops.

### Assumptions to confirm

1. **Rescheduling and payment.** A rescheduled Booking keeps its original payment. A change to a more expensive Service is not supported, since a Booking has one Service.
2. **"Any available Barber" rule.** Proposed: assign the free Barber with the fewest Bookings that day.
3. **Cutoff and reminder.** The 1-hour cancellation cutoff leaves time to cancel after the 2-hour reminder. If a Shop sets a cutoff longer than 2 hours, the reminder arrives after the cutoff. We should warn the Owner when they save it.
4. **Texts while registration is pending.** Clients' emails are not collected, so before a Shop's text registration is approved, confirmations and reminders cannot reach Clients. Options: delay the Shop's go-live until approval, or show the confirmation on screen only. Decide before the first install.
5. **Stripe details.** Confirm the negative-balance and dispute responsibility on connected accounts, and the current rule that Stripe keeps its fee on refunds. The refund-fee claim came from a secondary source and has not been checked against Stripe's own documentation.
6. **Sole-proprietor texting limits.** Confirm the sending caps for Shops without an EIN.
7. **Name and address.** "Barber Booking" is a working title. The booking link address format is not chosen.

### Questions for the shop visits

- What share of customers walk in without a Booking? This shapes the walk-in design.
- How many minutes does the Shop spend on each manual booking today? This feeds time saved.
- Which messaging app do Barbers already use, Telegram or WhatsApp?
- Would the Owner pay $39 or $59 a month after the free month?

### Next design topic

Walk-in monitoring (queue, wait time, a QR code at the door) is deferred on purpose and will be designed after the first shop visits.

### Sources

- [Twilio: ISV onboarding for A2P 10DLC](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/onboarding-isv)
- [Stripe: Design a Connect integration](https://docs.stripe.com/connect/design-an-integration)
