import type { Locale } from "@/lib/i18n/dictionaries";
import { formatPhone } from "@/lib/phone";
import type { SmsTemplate } from "@/server/dispatch";

/**
 * The words of every Client text, in English and Spanish. Every text says how to opt
 * out (carrier rule). Kept short: a text over
 * one segment costs more and counts more against the Shop's daily carrier limit.
 */

export type TextFacts = {
  locale: Locale;
  shopName: string;
  shopPhone: string | null;
  serviceName: string;
  barberName: string;
  startsAt: Date;
  timezone: string;
  manageUrl: string;
  rebookUrl: string;
};

/** "Tue, Jan 12, 10:00 AM" / "mar, 12 ene, 10:00 a. m." in the Shop's time zone. */
function when(f: TextFacts): string {
  const text = f.startsAt.toLocaleString(f.locale === "es" ? "es-US" : "en-US", {
    timeZone: f.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  // "sáb" -> "sab": one accented letter would switch the whole text to the
  // 70-character alphabet and double its segments.
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** The date/time then a period, without doubling the one in "a.m.". */
const whenDot = (f: TextFacts) => {
  const w = when(f);
  return w.endsWith(".") ? w : `${w}.`;
};

const EN: Record<SmsTemplate, (f: TextFacts) => string> = {
  confirmation: (f) =>
    `${f.shopName}: booked! ${f.serviceName} with ${f.barberName}, ${whenDot(f)} Change or cancel: ${f.manageUrl} Reply STOP to opt out.`,
  reminder: (f) =>
    `${f.shopName}: reminder, ${f.serviceName} with ${f.barberName}, ${whenDot(f)} Change or cancel: ${f.manageUrl} Reply STOP to opt out.`,
  cancelled: (f) =>
    `${f.shopName}: the shop cancelled your ${f.serviceName} on ${whenDot(f)}` +
    (f.shopPhone ? ` Questions? Call ${formatPhone(f.shopPhone)}.` : "") +
    ` Book again: ${f.rebookUrl} Reply STOP to opt out.`,
  rescheduled: (f) => `${f.shopName}: your ${f.serviceName} with ${f.barberName} moved to ${whenDot(f)} Details: ${f.manageUrl} Reply STOP to opt out.`,
};

const ES: Record<SmsTemplate, (f: TextFacts) => string> = {
  confirmation: (f) =>
    `${f.shopName}: ¡cita confirmada! ${f.serviceName} con ${f.barberName}, ${whenDot(f)} Cambiar o cancelar: ${f.manageUrl} Responde STOP para no recibir textos.`,
  reminder: (f) =>
    `${f.shopName}: recordatorio, ${f.serviceName} con ${f.barberName}, ${whenDot(f)} Cambiar o cancelar: ${f.manageUrl} Responde STOP para no recibir textos.`,
  cancelled: (f) =>
    `${f.shopName}: tu cita de ${f.serviceName} del ${when(f)} fue cancelada.` +
    (f.shopPhone ? ` ¿Preguntas? Llama al ${formatPhone(f.shopPhone)}.` : "") +
    ` Reserva de nuevo: ${f.rebookUrl} Responde STOP para no recibir textos.`,
  rescheduled: (f) => `${f.shopName}: tu cita de ${f.serviceName} con ${f.barberName} ahora es el ${whenDot(f)} Detalles: ${f.manageUrl} Responde STOP para no recibir textos.`,
};

export function renderText(template: SmsTemplate, f: TextFacts): string {
  const text = (f.locale === "es" ? ES : EN)[template](f);
  // Date formatting uses no-break spaces ("10:00 AM"); plain spaces keep the text in
  // the cheaper GSM alphabet.
  return text.replace(/[\u00a0\u202f]/g, " ");
}

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€"; // each takes two characters

/** How many SMS segments a text uses (what carriers count against daily limits). */
export function smsSegments(text: string): number {
  let gsmLength = 0;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) gsmLength += 1;
    else if (GSM_EXTENDED.includes(ch)) gsmLength += 2;
    else {
      // Any other character (á, í, ó, ú, emoji...) switches the whole text to UCS-2.
      const units = text.length; // UTF-16 code units
      return units <= 70 ? 1 : Math.ceil(units / 67);
    }
  }
  return gsmLength <= 160 ? 1 : Math.ceil(gsmLength / 153);
}
