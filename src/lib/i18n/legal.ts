import type { Locale } from "./dictionaries";

/**
 * The /privacy and /terms pages, in English only (Spanish speakers use their browser's
 * translation; the old /es pages forward here), plus the bilingual 404.
 * A draft written with the user on 2026-11-12 (progress.md, "L4 grill
 * answers"); have it reviewed before launch.
 * LAUNCH PREREQUISITES: put the operator's legal name in OPERATOR and a real inbox in
 * CONTACT_EMAIL (U5, once the domain exists). While CONTACT_EMAIL is the placeholder the
 * pages show it as plain text, not a mailto link (see CONTACT_IS_PLACEHOLDER).
 */
export const OPERATOR = "Barber Master";
export const CONTACT_EMAIL = "support@[domain]";
export const CONTACT_IS_PLACEHOLDER = CONTACT_EMAIL.includes("[");
/** ISO date for <time dateTime>; keep it in step with LAST_UPDATED. */
export const LAST_UPDATED_ISO = "2026-11-12";
export const LAST_UPDATED = "November 12, 2026";

export type LegalPageKey = "privacy" | "terms";
export type LegalSection = { heading: string; body: string[] };
export type LegalPage = { title: string; metaDescription: string; intro: string; sections: LegalSection[] };
export type LegalDictionary = {
  updated: string;
  contactLabel: string;
  contactBody: string;
  /** Accessible name of the wordmark link home (keeps the visible "Barber Master"). */
  back: string;
  skipLink: string;
  privacy: LegalPage;
  terms: LegalPage;
};

/** Each legal page's URL. */
export const legalPaths: Record<LegalPageKey, string> = { privacy: "/privacy", terms: "/terms" };

/** The 404 can't know the visitor's language statically, so it shows both. */
export const notFoundCopy: Record<Locale, { title: string; body: string; home: string }> = {
  en: { title: "This page doesn't exist.", body: "The link may be old or mistyped.", home: "Go to the home page" },
  es: { title: "Esta página no existe.", body: "Puede que el enlace sea viejo o tenga un error.", home: "Ir a la página de inicio" },
};

const en: LegalDictionary = {
  updated: "Last updated",
  contactLabel: "Contact",
  contactBody: "Questions about this page or your data? Write to us:",
  back: "Barber Master home",
  skipLink: "Skip to content",
  privacy: {
    title: "Privacy",
    metaDescription: "What Barber Master collects, why, who helps us run it, and how to have your data deleted.",
    intro: `${OPERATOR} ("we") runs online booking for barbershops. This page explains what we collect, why, and the choices you have. We keep it short and we don't sell your data.`,
    sections: [
      {
        heading: "Who is responsible for your data",
        body: [
          "If you booked a cut, your details belong to the barbershop you booked with (the Shop). We store and use them only to run that Shop's bookings, on the Shop's behalf. Questions about your bookings go to the Shop first; we'll help them answer.",
          "If you're a Shop owner or barber, or you contacted us through our website, we are responsible for your data.",
        ],
      },
      {
        heading: "What we collect",
        body: [
          "Clients: your name, your mobile number, and your bookings (service, barber, time, status, and whether you paid online). We don't ask for an email address or create an account for you.",
          "Payments: if you pay online, the card payment is handled by our payment processor. We never see or store your card number; we keep only the payment's status and amount.",
          "Shop owners and barbers: your name, the email you sign in with, your shop's details, and, if a barber connects it, the Telegram chat used for booking alerts.",
          "Website contact form: your name, your shop's name, your phone number, and anything you choose to write to us.",
          "Technical data: basic logs (such as IP address and browser type) that our providers keep to run and protect the service.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To make, change and cancel bookings, and to show the Shop its schedule.",
          "To send the booking texts and alerts described below.",
          "To process online payments and refunds.",
          "To answer you when you contact us, and to keep the service secure and working.",
          "We don't use your data for advertising, and we don't sell or rent it to anyone.",
        ],
      },
      {
        heading: "Text messages",
        body: [
          "When you book, you agree to get a confirmation text and one reminder about 2 hours before your appointment (usually 2 texts per booking), plus a text if the Shop cancels or moves your booking. Message and data rates may apply.",
          "Reply STOP to any text to stop getting them, or HELP for help. You can also contact us.",
          "Your mobile number and your consent to receive texts are never shared with or sold to third parties for their marketing.",
        ],
      },
      {
        heading: "Who helps us run the service",
        body: [
          "We use trusted providers that process data only to provide their service to us: Supabase (database), Twilio (text messages), Resend (email), Telegram (barber alerts), Stripe (online payments), Cloudflare Turnstile (bot checks on our forms), and our hosting provider.",
          "We may also share data if the law requires it, or to protect the safety of people or the service.",
        ],
      },
      {
        heading: "Cookies",
        body: [
          "We use only the cookies the service needs: one remembers your language, one keeps staff signed in, and our bot-check and payment providers set their own to work securely. We don't use advertising or tracking cookies.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "We keep a Shop's data while the Shop uses Barber Master. When a Shop cancels, it can export its client list, and we delete the Shop's data 30 days later.",
          "Website contact messages are kept while we're in touch, then deleted when they're no longer needed. Our providers may keep backups and logs for a limited time.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "You can ask to see, correct or delete your data. Clients can also ask the Shop directly. Write to us at the address below and we'll answer within 30 days.",
        ],
      },
      {
        heading: "Children",
        body: ["The service isn't meant for children under 13, and we don't knowingly collect their data."],
      },
      {
        heading: "Security",
        body: [
          "Data is sent over encrypted connections, access is limited to people who need it, and every access by our support team to a Shop's data is logged.",
        ],
      },
      {
        heading: "Changes",
        body: ["If we change this page, we'll update the date at the top. If a change is important, we'll tell Shop owners before it takes effect."],
      },
    ],
  },
  terms: {
    title: "Terms",
    metaDescription: "The rules for using Barber Master: bookings, texts, payments and refunds, and what each side is responsible for.",
    intro: `These terms apply when you use Barber Master, the booking service run by ${OPERATOR} ("we"). By booking an appointment or using the service for your shop, you agree to them.`,
    sections: [
      {
        heading: "The service",
        body: [
          "Barber Master lets clients book appointments with barbershops (Shops) online, and lets Shops manage those bookings. The Shop, not Barber Master, provides the haircut and every other service you book, and sets its prices, hours and rules.",
        ],
      },
      {
        heading: "Booking as a client",
        body: [
          "Give your real name and a mobile number you can receive texts on. A booking is a request to the Shop at the time shown; please arrive on time.",
          "You can cancel or change your booking from the link in your texts until the Shop's cutoff time. After that, call the Shop.",
          "A Shop may refuse or cancel a booking, for example if it has to close.",
        ],
      },
      {
        heading: "Texts",
        body: [
          "Booking texts are a confirmation, one reminder about 2 hours before, and updates if your booking changes (usually 2 texts per booking). Message and data rates may apply. Reply STOP to opt out, HELP for help. Carriers are not liable for delayed or undelivered messages.",
        ],
      },
      {
        heading: "Online payments and refunds",
        body: [
          "Some Shops let you pay online when you book. The payment goes to the Shop, through our payment processor. Your time is held for 10 minutes while you pay; if the payment doesn't finish, the time is released.",
          "If you cancel in time, or the Shop cancels, you get a full refund to the same card. A payment that arrives after the hold has expired is refunded automatically. If you move a booking, your payment moves with it. Refunds can take a few business days to appear.",
          "Paying at the shop is between you and the Shop.",
        ],
      },
      {
        heading: "For Shops",
        body: [
          "Your first month is free. After that, the service costs one monthly price that we agree with you in person, with no contract: you can cancel anytime.",
          "Keep your services, prices, hours and barbers accurate, and keep staff sign-ins to the people who work at your shop.",
          "Your client list is yours. When you cancel, you can export it, and we delete your shop's data 30 days later.",
          "Use client phone numbers only for bookings, as described in our Privacy page, and follow the texting rules that apply to you.",
        ],
      },
      {
        heading: "Fair use",
        body: [
          "Don't misuse the service: no fake bookings, no trying to break in or overload it, and no using it to send spam or anything illegal. We may block numbers or accounts that do.",
        ],
      },
      {
        heading: "Availability",
        body: [
          "We work to keep Barber Master running, but we can't promise it will never be interrupted. If something goes wrong with a booking, contact the Shop or us and we'll help sort it out.",
        ],
      },
      {
        heading: "Responsibility",
        body: [
          "The service is provided as is. To the extent the law allows, we aren't responsible for indirect losses, or for the services Shops provide. Nothing in these terms limits rights you have under the law that can't be limited.",
        ],
      },
      {
        heading: "Law",
        body: ["These terms are governed by the laws of the State of New York."],
      },
      {
        heading: "Changes",
        body: ["If we change these terms, we'll update the date at the top. If a change is important, we'll tell Shop owners before it takes effect."],
      },
    ],
  },
};

export const legalText: LegalDictionary = en;
