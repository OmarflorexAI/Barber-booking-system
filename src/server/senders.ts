import "server-only";
import { createAlerts, type Alerts, type ChatProvider, type EmailProvider } from "./alerts";
import { getSql } from "./db";
import { requireManageLinkSecret } from "./booking-engine/manage-token";
import { createDispatcher, type Senders } from "./dispatch";
import { createLeads, type Leads } from "./leads";
import { bookingEngine } from "./engine";
import { createPayments, type Payments } from "./payments";
import { createStripePayments } from "./providers/stripe";
import { createResendEmail } from "./providers/resend";
import { createTelegramChat } from "./providers/telegram";
import { createTwilioSms } from "./providers/twilio";
import { createTexting, type SmsProvider, type Texting } from "./texting";

/**
 * Wires the sending worker to real providers. Each provider is used only when its
 * keys are in the environment; otherwise a log-only stand-in prints what would have
 * been sent, so everything can be tried locally without accounts.
 */

const env = (name: string) => process.env[name]?.trim() || undefined;
const siteUrl = () => env("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000";
const isProd = process.env.NODE_ENV === "production";

/** Show only the last 4 digits of a phone number in logs. */
const maskPhone = (e164: string) => `***${e164.slice(-4)}`;

const logSms: SmsProvider = {
  async send({ to, body }) {
    // In development the full text (with its manage link) is handy; in production it stays private.
    console.info("[send:sms]", { to: maskPhone(to), ...(isProd ? { chars: body.length } : { body }) });
    return { id: `log-${Date.now()}` };
  },
};
const logChat: ChatProvider = {
  async send({ chatId, text }) {
    console.info("[send:telegram]", { chatId, text });
  },
};
const logEmail: EmailProvider = {
  async send({ to, subject }) {
    console.info("[send:email]", { recipients: to.length, subject });
  },
};

function smsProvider(): SmsProvider {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const authToken = env("TWILIO_AUTH_TOKEN");
  return accountSid && authToken ? createTwilioSms({ accountSid, authToken }) : logSms;
}

/** The real Telegram bot, or null when TELEGRAM_BOT_TOKEN is not set. */
export function telegramBot() {
  const botToken = env("TELEGRAM_BOT_TOKEN");
  return botToken ? createTelegramChat({ botToken }) : null;
}

function emailProvider(): EmailProvider {
  const apiKey = env("RESEND_API_KEY");
  // onboarding@resend.dev only delivers to the Resend account's own address; set EMAIL_FROM
  // to an address on a verified domain to email anyone.
  return apiKey ? createResendEmail({ apiKey, from: env("EMAIL_FROM") ?? "Barber Master <onboarding@resend.dev>" }) : logEmail;
}

let textingModule: Texting | undefined;
let alertsModule: Alerts | undefined;
let paymentsModule: Payments | null | undefined;
let dispatcher: ReturnType<typeof createDispatcher> | undefined;
let leadsModule: Leads | undefined;

/** Client texts (B3). */
export function texting(): Texting {
  textingModule ??= createTexting({
    sql: getSql(),
    provider: smsProvider(),
    config: {
      siteUrl: siteUrl(),
      manageLinkSecret: requireManageLinkSecret(process.env.MANAGE_LINK_SECRET),
      defaultFrom: env("TWILIO_FROM_NUMBER") ?? "+15005550006", // Twilio's test "from" number
      dailySegmentCap: Number(env("SMS_DAILY_SEGMENT_CAP") ?? 900),
    },
  });
  return textingModule;
}

/** Barber alerts, Telegram linking and the Owner's daily email (B4). */
export function alerts(): Alerts {
  alertsModule ??= createAlerts({
    sql: getSql(),
    chat: telegramBot() ?? logChat,
    email: emailProvider(),
    config: { siteUrl: siteUrl(), botUsername: env("TELEGRAM_BOT_USERNAME") ?? "your_bot" },
  });
  return alertsModule;
}

/** Shop Owners' requests from the landing page, emailed to the Platform admins. */
export function leads(): Leads {
  leadsModule ??= createLeads({ sql: getSql(), email: emailProvider() });
  return leadsModule;
}

/** Online payments (B2), or null when STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are not set. */
export function payments(): Payments | null {
  if (paymentsModule === undefined) {
    const secretKey = env("STRIPE_SECRET_KEY");
    const webhookSecret = env("STRIPE_WEBHOOK_SECRET");
    paymentsModule =
      secretKey && webhookSecret
        ? createPayments({ sql: getSql(), engine: bookingEngine(), provider: createStripePayments({ secretKey, webhookSecret }), config: { siteUrl: siteUrl() } })
        : null;
  }
  return paymentsModule;
}

const senders: Senders = {
  sms: (m) => texting().send(m),
  barberAlert: (m) => alerts().send(m),
  async refund(r) {
    const p = payments();
    // Throwing keeps the refund in the outbox to retry once payments are set up.
    if (!p) throw new Error("online payments are not set up (STRIPE_SECRET_KEY)");
    await p.refund(r);
  },
  refundFailed: (f) => alerts().refundFailed(f),
};

/** The app-wide sending worker. */
export function sendingWorker() {
  dispatcher ??= createDispatcher({ sql: getSql(), senders });
  return dispatcher;
}
