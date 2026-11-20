/** Text for the landing page that sells Barber Master to Shop Owners. */

const en = {
  metaTitle: "Barber Master: online booking for your barbershop",
  metaDescription:
    "Clients book from your link or the QR at the counter. Your barbers get an alert instead of a phone call. We set it all up for you, in Spanish and English. First month free.",
  staffSignIn: "Staff sign in",
  skipLink: "Skip to content",

  nav: { how: "How it works", setup: "Setup", pricing: "Pricing", faq: "FAQ" },
  navLabel: "Sections",
  navMenu: "Menu",
  navCta: "Talk to us",
  navLogin: "Log in",
  navSignup: "Sign up",

  heroTitle: "Stop answering the phone in the middle of a cut.",
  heroBody:
    "Clients book from your link or the QR code at the counter. Your barbers get an alert on their phone or by email. We set it all up for you, in Spanish and English, and the first month is free.",
  heroDemo: "See a real booking page",

  // The interactive phone in the hero: a pretend booking at the demo shop (nothing is saved).
  heroPhone: {
    label: "Try the booking page",
    hint: "Try it: tap a service",
    shop: "Fresh Cuts Barbershop",
    address: "1234 Grand Concourse, Bronx, NY",
    chooseService: "Choose a service",
    from: "from",
    services: [
      { name: "Haircut", min: 30, price: 30, was: 0, special: "" },
      { name: "Skin fade", min: 45, price: 35, was: 0, special: "" },
      { name: "Beard trim", min: 15, price: 15, was: 0, special: "" },
      { name: "Haircut + beard", min: 45, price: 35, was: 40, special: "Weekday special" },
      { name: "Kids cut (under 12)", min: 30, price: 20, was: 0, special: "" },
    ],
    back: "Back",
    chooseBarber: "Choose a barber",
    anyBarber: "Any available barber",
    anyBarberHint: "First free chair",
    barbers: ["Carlos", "Dre", "Maya", "Luis"],
    pickTime: "Pick a time",
    dateLocale: "en-US", // the day strip's weekday and date names (the dates themselves come from the clock)
    times: ["10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM"],
    taken: [1, 4, 5, 9],
    noTimes: "No free times this day",
    bookedTitle: "You're booked",
    bookedWith: "with",
    bookedAt: "at",
    bookedNote: "We'll text you a reminder 2 hours before, with a link to change or cancel.",
    again: "Book another",
  },

  // The "why" block under the hero.
  whyTitle: "Every call stops a cut.",
  whyLead: "Right now your bookings are all over the place.",
  whyBody: [
    "They come in by phone, by WhatsApp, in Instagram DMs and in the notebook by the register. Every call means a barber stops mid-cut, puts the clippers down and checks who's free. The client in the chair waits while they do.",
    "When someone doesn't show, nobody finds out until the chair is already empty. At the end of the week, it's hard to say how many bookings really came in. Barber Master gives every booking one place to land.",
  ],

  // The bordered grid of things that work today.
  factsLabel: "What works today",
  facts: [
    "No app or account for your clients",
    "English and Español on every screen",
    "Clients pay online or at the shop",
    "“Any available barber” gives the first free chair",
    "Walk-ins go on the same day view",
    "Your client list stays yours. Export it any time.",
  ],

  howTitle: "From booking to reminder, without a call",
  howBody: "Every booking follows the same three steps, so nobody has to pick up the phone.",
  how: [
    { title: "The client books in under a minute", body: "From your link or the QR at the counter. They pick the service, the barber and a free time. No app, no account." },
    { title: "The barber gets an alert", body: "On Telegram or by email, once they're connected. Nobody has to pick up the phone to know the schedule." },
    { title: "The client gets a reminder", body: "A text 2 hours before, with a link to cancel or change the time, so the chair doesn't sit empty." },
  ],
  // The small UI cards over the how-it-works photos (example data).
  howStage: {
    service: "Skin fade",
    serviceMeta: "45 min · $35",
    barber: "With Dre · Thursday",
    times: ["3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM"],
    picked: 2,
    taken: [1, 4],
    booked: "Booked · Thu 4:00 PM",
    alertFrom: "Barber Master",
    alertWhen: "now",
    alertTitle: "New booking",
    alertBody: "Marcus · Skin fade · Thu 4:00 PM",
    dayTitle: "Dre's Thursday",
    day: [
      { time: "2:30 PM", who: "Luis · Fade" },
      { time: "4:00 PM", who: "Marcus · Skin fade", isNew: true },
      { time: "5:00 PM", who: "Kevin · Beard trim" },
    ],
    newBadge: "New",
    textFrom: "Fresh Cuts Barbershop",
    text: "Hi Marcus, your skin fade with Dre is today at 4:00 PM. Change or cancel here: fc.bm/m/8k2",
    textSent: "Sent 2:00 PM, 2 hours before",
    textActions: ["Change time", "Cancel"],
  },

  setupTitle: "We set it up for you",
  setupBody: "You don't have to learn software. We come to the shop and do it with you.",
  setupCards: [
    { title: "We come to your shop", steps: [0, 1] },
    { title: "Your link works the same day", steps: [2, 3] },
  ],
  setup: [
    "We visit the shop and add your services, prices, barbers and hours.",
    "We bring over your client list from your phone or notebook.",
    "You get your booking link and a QR code for the counter and the mirror.",
    "We show your barbers how their booking alerts work, in 10 minutes.",
  ],
  setupSupport: "When something doesn't work, you text a real person who answers, in Spanish or English.",

  // The first-month timeline.
  monthPill: "Your first month",
  monthTitle: "How your first month works",
  monthBody: "One visit to set it up, then a month to see it work in your shop. Nothing to install and nothing to pay.",
  monthStart: "Starts here",
  month: [
    {
      when: "Day 1",
      title: "Setup & go-live",
      body: "We come to your shop and set it up with you: services, prices, barbers and hours. Your booking link and the QR code for the counter work before we leave.",
      tags: ["Setup visit", "Your booking link", "QR code for the counter"],
    },
    {
      when: "Week 1",
      title: "Launch & first bookings",
      body: "Share the link on Instagram and WhatsApp and put the QR by the mirror. Clients pick a barber and a time on their phone, with no account and no app.",
      tags: ["Link on Instagram & WhatsApp", "No account for clients", "Every booking on Today"],
    },
    {
      when: "Weeks 2–3",
      title: "Routine & fewer calls",
      body: "As your regulars get used to the link, fewer of them tend to call to book. You run the day from one screen: bookings, walk-ins, arrivals and no-shows.",
      tags: ["Walk-ins on the same day", "Arrived or no-show in one tap", "The week's bookings at a glance"],
    },
    {
      when: "Day 30",
      title: "Review & decide",
      body: "Your Dashboard shows the month: bookings, walk-ins and time saved. Keep going at $50 a month, with no contract. Or stop, and take your client list with you.",
      tags: ["Your month on the Dashboard", "No contract", "Your client list stays yours"],
    },
  ],

  offerTitle: "Your first month is free",
  offerBody: "Try it at your shop for a month. Then $50 a month, no contract, cancel anytime.",
  plans: [
    {
      name: "First month",
      price: "Free",
      items: [
        "Setup visit at your shop",
        "Your booking link and QR code",
        "Online payments for your clients",
        "Each barber's bookings sent to their phone",
        "A short email for the owner every morning",
      ],
    },
    {
      name: "After your free month",
      price: "$50 a month",
      items: [
        "Everything keeps working, just like month one",
        "Each client gets a text 2 hours before",
        "A real person answers, in Spanish or English",
        "No contract, cancel anytime",
        "Your client list stays yours if you leave",
      ],
    },
  ],

  faqTitle: "Questions owners ask",
  faq: [
    { q: "Do my clients need to download an app?", a: "No. They open a link or scan the QR code and book in their phone's browser. No account, no password." },
    { q: "Do I need a card reader?", a: "No. Clients who pay online pay on a secure page and the money goes to your account. Everyone else pays at the shop like today." },
    { q: "What about walk-ins?", a: "Keep taking them. Add them from the day screen in two taps, so online clients never get a time that's already taken." },
    {
      q: "How much is it after the free month?",
      a: "$50 a month. There's no contract: you can cancel anytime, and you take your client list with you.",
    },
    { q: "Who sees my clients' information?", a: "Only your shop. We never sell it or use it to advertise, and we never store card numbers." },
  ],

  formTitle: "Get your free month",
  formBody: "Leave your number and we'll call or text you within a day to set up a visit.",
  shopName: "Shop name",
  ownerName: "Your name",
  phone: "Mobile phone",
  optional: "optional",
  barbers: "Barbers in the shop",
  barbersPick: "Choose…",
  barbersMore: "7 or more",
  message: "Anything we should know?",
  messageHint: "For example: how you take bookings today.",
  send: "Send",
  sending: "Sending…",
  verifying: "Checking you're not a robot…",
  thanksTitle: "Thanks, we got it.",
  thanksBody: "We'll call or text you within a day to set up the visit.",
  errors: {
    INVALID_INPUT: "Fill in your shop's name and your name.",
    INVALID_PHONE: "That phone number doesn't look right. Use a 10-digit US number.",
    BOT_CHECK: "The robot check didn't finish. Wait a moment and press Send again.",
    UNKNOWN: "That didn't go through. Try again, or text us.",
  } as Record<string, string>,

  footer: "Online booking for barbershops in the Bronx and upper Manhattan.",
  footerLinks: "Legal and staff",
  footerPage: "On this page",
  footerHome: "Barber Master, home page",
  privacy: "Privacy",
  terms: "Terms",
};

type LandingDictionary = typeof en;

/** English only: Spanish speakers use their browser's translation (no Spanish landing since 2026-11-20). */
export const landingText: LandingDictionary = en;
export type { LandingDictionary };
