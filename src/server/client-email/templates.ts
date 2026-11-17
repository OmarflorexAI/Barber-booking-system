import type { Locale } from "@/lib/i18n/dictionaries";
import { formatPhone } from "@/lib/phone";
import type { ClientEmailKind } from "@/server/dispatch";

/**
 * The words of every Client email, in English and Spanish (the language the Client
 * booked in). Each has a subject, a plain-text body and a simple HTML body with the
 * same facts: Shop, Service, Barber, date and time in the Shop's time zone, and the
 * manage link (or the booking page, once the Booking is cancelled).
 */

export type EmailFacts = {
  locale: Locale;
  kind: ClientEmailKind;
  shopName: string;
  shopPhone: string | null;
  serviceName: string;
  barberName: string;
  startsAt: Date;
  /** The old start time of a moved Booking. */
  previousStartsAt?: Date | null;
  /** Who made the change (cancelled / rescheduled). */
  by?: "client" | "barber" | "owner" | null;
  timezone: string;
  manageUrl: string;
  rebookUrl: string;
};

export type RenderedEmail = { subject: string; text: string; html: string };

/** "Tuesday, January 12, 10:00 AM" / "martes, 12 de enero, 10:00 a. m." in the Shop's time zone. */
function when(d: Date, f: EmailFacts): string {
  return d
    .toLocaleString(f.locale === "es" ? "es-US" : "en-US", {
      timeZone: f.timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(/[  ]/g, " ");
}

type Words = {
  subject: string;
  lead: string;
  rows: [string, string][];
  linkLabel: string;
  linkUrl: string;
  /** Lines after the link (e.g. how to reach the Shop). */
  after: string[];
  footer: string;
};

function enWords(f: EmailFacts): Words {
  const call = f.shopPhone ? `Questions? Call ${f.shopName} at ${formatPhone(f.shopPhone)}.` : null;
  const details: [string, string][] = [
    ["Shop", f.shopName],
    ["Service", f.serviceName],
    ["Barber", f.barberName],
    ["When", when(f.startsAt, f)],
  ];
  const footer = `You got this email because you left it when you booked at ${f.shopName}.`;
  switch (f.kind) {
    case "confirmation":
      return {
        subject: `Booked: ${f.serviceName} at ${f.shopName}, ${when(f.startsAt, f)}`,
        lead: "Your booking is confirmed.",
        rows: details,
        linkLabel: "Change or cancel your booking",
        linkUrl: f.manageUrl,
        after: call ? [call] : [],
        footer,
      };
    case "rescheduled":
      return {
        subject: `New time: ${f.serviceName} at ${f.shopName}, ${when(f.startsAt, f)}`,
        lead: f.by === "client" ? "You moved your booking. Here is the new time." : `${f.shopName} moved your booking. Here is the new time.`,
        rows: f.previousStartsAt ? [...details, ["Was", when(f.previousStartsAt, f)]] : details,
        linkLabel: "See your booking",
        linkUrl: f.manageUrl,
        after: call ? [call] : [],
        footer,
      };
    case "cancelled":
      return {
        subject: `Cancelled: ${f.serviceName} at ${f.shopName}, ${when(f.startsAt, f)}`,
        lead: f.by === "client" ? "You cancelled this booking." : `${f.shopName} cancelled this booking.`,
        rows: details,
        linkLabel: "Book again",
        linkUrl: f.rebookUrl,
        after: call ? [call] : [],
        footer,
      };
  }
}

function esWords(f: EmailFacts): Words {
  const call = f.shopPhone ? `¿Preguntas? Llama a ${f.shopName} al ${formatPhone(f.shopPhone)}.` : null;
  const details: [string, string][] = [
    ["Barbería", f.shopName],
    ["Servicio", f.serviceName],
    ["Barbero", f.barberName],
    ["Cuándo", when(f.startsAt, f)],
  ];
  const footer = `Recibes este correo porque lo dejaste al reservar en ${f.shopName}.`;
  switch (f.kind) {
    case "confirmation":
      return {
        subject: `Cita confirmada: ${f.serviceName} en ${f.shopName}, ${when(f.startsAt, f)}`,
        lead: "Tu cita está confirmada.",
        rows: details,
        linkLabel: "Cambiar o cancelar tu cita",
        linkUrl: f.manageUrl,
        after: call ? [call] : [],
        footer,
      };
    case "rescheduled":
      return {
        subject: `Nueva hora: ${f.serviceName} en ${f.shopName}, ${when(f.startsAt, f)}`,
        lead: f.by === "client" ? "Cambiaste tu cita. Esta es la nueva hora." : `${f.shopName} cambió tu cita. Esta es la nueva hora.`,
        rows: f.previousStartsAt ? [...details, ["Antes", when(f.previousStartsAt, f)]] : details,
        linkLabel: "Ver tu cita",
        linkUrl: f.manageUrl,
        after: call ? [call] : [],
        footer,
      };
    case "cancelled":
      return {
        subject: `Cita cancelada: ${f.serviceName} en ${f.shopName}, ${when(f.startsAt, f)}`,
        lead: f.by === "client" ? "Cancelaste esta cita." : `${f.shopName} canceló esta cita.`,
        rows: details,
        linkLabel: "Reservar de nuevo",
        linkUrl: f.rebookUrl,
        after: call ? [call] : [],
        footer,
      };
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function renderClientEmail(f: EmailFacts): RenderedEmail {
  const w = f.locale === "es" ? esWords(f) : enWords(f);

  const text = [w.lead, "", ...w.rows.map(([k, v]) => `${k}: ${v}`), "", `${w.linkLabel}: ${w.linkUrl}`, ...w.after, "", w.footer].join("\n");

  const e = escapeHtml;
  const rows = w.rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#555;vertical-align:top">${e(k)}</td><td style="padding:4px 0;font-weight:600">${e(v)}</td></tr>`,
    )
    .join("");
  const html =
    `<!doctype html><html lang="${f.locale}"><body style="margin:0;padding:24px 16px;background:#ffffff;color:#111;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5">` +
    `<div style="max-width:520px;margin:0 auto">` +
    `<p style="margin:0 0 16px;font-size:18px;font-weight:600">${e(w.lead)}</p>` +
    `<table role="presentation" style="border-collapse:collapse;margin:0 0 24px">${rows}</table>` +
    `<p style="margin:0 0 16px"><a href="${e(w.linkUrl)}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">${e(w.linkLabel)}</a></p>` +
    w.after.map((line) => `<p style="margin:0 0 16px">${e(line)}</p>`).join("") +
    `<p style="margin:24px 0 0;color:#666;font-size:13px">${e(w.footer)}</p>` +
    `</div></body></html>`;

  return { subject: w.subject, text, html };
}
