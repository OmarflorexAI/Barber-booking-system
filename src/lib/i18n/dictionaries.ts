export type Locale = "en" | "es";
export const LOCALES: Locale[] = ["en", "es"];
export const LOCALE_COOKIE = "lang";

const en = {
  langName: "English",
  otherLang: "Español",
  // booking flow
  stepService: "Choose a service",
  stepBarber: "Choose your barber",
  stepTime: "Pick a time",
  stepDetails: "Your details",
  back: "Back",
  min: "min",
  from: "from",
  special: "Special",
  specialUntil: "until",
  anyBarber: "Any available barber",
  anyBarberHint: "Get the earliest time",
  specialties: "Specialties",
  noSlots: "No free times this day. Try another day.",
  loadingSlots: "Loading times…",
  name: "Your name",
  phone: "Mobile phone",
  phoneHint: "We only use it for this booking.",
  payment: "Payment",
  payInPerson: "Pay at the shop",
  payOnline: "Pay now by card",
  tipsInPerson: "Tips are paid in person.",
  refundRule: (cutoff: string) =>
    `You can cancel or change your time online until ${cutoff} before your booking. Paid online? Cancelling in time gets a full refund. After that, please call the shop.`,
  smsConsent:
    "By booking you agree to get a confirmation and a reminder text for this booking. Reply STOP to opt out.",
  smsPending: "Text messages are not active yet for this shop. Save your booking link below.",
  confirm: "Book now",
  booking: "Booking…",
  total: "Total",
  // confirmation
  booked: "You're booked!",
  bookedWith: "with",
  saveLink: "Save this link to cancel or change your time:",
  copy: "Copy link",
  copied: "Copied",
  bookAnother: "Book another",
  // manage
  yourBooking: "Your booking",
  status: {
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    arrived: "Completed",
    no_show: "Missed",
  } as Record<string, string>,
  cancelBooking: "Cancel booking",
  cancelConfirm: "Cancel this booking?",
  changeTime: "Change time",
  saveNewTime: "Move to this time",
  cancelled: "Your booking is cancelled.",
  moved: "Your booking was moved.",
  tooLate: (phone: string | null) =>
    `It's too late to change this booking online. Please call the shop${phone ? ` at ${phone}` : ""}.`,
  notFound: "We couldn't find this booking.",
  shopNotFound: "We couldn't find this shop.",
  // errors
  errors: {
    SLOT_TAKEN: "That time was just taken. Please pick another.",
    OUTSIDE_WINDOW: "Please pick a time at least 30 minutes from now and within 30 days.",
    INVALID_INPUT: "Please check your name and phone number.",
    PHONE_BLOCKED: "This number can't book online. Please call the shop.",
    UNPAID_LIMIT: "You already have 2 upcoming bookings to pay at the shop. Cancel one or call the shop.",
    CUTOFF_PASSED: "It's too late to change this booking online. Please call the shop.",
    BOOKING_NOT_ACTIVE: "This booking can no longer be changed.",
    SHOP_UNAVAILABLE: "This shop isn't taking online bookings right now.",
    NOT_FOUND: "Not found.",
    FORBIDDEN: "You can't do that.",
    DAY_HAS_BOOKINGS: "There are bookings that day. Cancel or move them first.",
    BOT_CHECK: "Please complete the security check and try again.",
    UNKNOWN: "Something went wrong. Please try again.",
  } as Record<string, string>,
  // staff
  login: "Sign in",
  loginHint: "We'll email you a sign-in link. No password needed.",
  email: "Email",
  sendLink: "Send sign-in link",
  linkSent: "Check your email for the sign-in link.",
  signOut: "Sign out",
  today: "Today",
  prevDay: "Previous day",
  nextDay: "Next day",
  noBookings: "No bookings this day.",
  walkIn: "Walk-in",
  logWalkIn: "Log walk-in now",
  arrived: "Arrived",
  noShow: "No-show",
  cancel: "Cancel",
  paid: "Paid online",
  payAtShop: "Pay at shop",
  notMember: "This account isn't linked to a shop yet. Ask the platform team to add you.",
  barber: "Barber",
  service: "Service",
};

export type Dictionary = typeof en;

const es: Dictionary = {
  langName: "Español",
  otherLang: "English",
  stepService: "Elige un servicio",
  stepBarber: "Elige tu barbero",
  stepTime: "Elige la hora",
  stepDetails: "Tus datos",
  back: "Atrás",
  min: "min",
  from: "desde",
  special: "Oferta",
  specialUntil: "hasta el",
  anyBarber: "Cualquier barbero disponible",
  anyBarberHint: "La hora más pronto",
  specialties: "Especialidades",
  noSlots: "No hay horas libres este día. Prueba otro día.",
  loadingSlots: "Cargando horas…",
  name: "Tu nombre",
  phone: "Celular",
  phoneHint: "Solo lo usamos para esta cita.",
  payment: "Pago",
  payInPerson: "Pagar en la barbería",
  payOnline: "Pagar ahora con tarjeta",
  tipsInPerson: "Las propinas se dan en persona.",
  refundRule: (cutoff: string) =>
    `Puedes cancelar o cambiar la hora en línea hasta ${cutoff} antes de tu cita. ¿Pagaste en línea? Si cancelas a tiempo te devolvemos todo. Después, llama a la barbería.`,
  smsConsent:
    "Al reservar aceptas recibir un mensaje de confirmación y un recordatorio para esta cita. Responde STOP para no recibir más.",
  smsPending: "Los mensajes de texto aún no están activos en esta barbería. Guarda el enlace de tu cita.",
  confirm: "Reservar",
  booking: "Reservando…",
  total: "Total",
  booked: "¡Listo, tienes tu cita!",
  bookedWith: "con",
  saveLink: "Guarda este enlace para cancelar o cambiar la hora:",
  copy: "Copiar enlace",
  copied: "Copiado",
  bookAnother: "Reservar otra",
  yourBooking: "Tu cita",
  status: {
    confirmed: "Confirmada",
    cancelled: "Cancelada",
    arrived: "Completada",
    no_show: "No asistió",
  },
  cancelBooking: "Cancelar cita",
  cancelConfirm: "¿Cancelar esta cita?",
  changeTime: "Cambiar hora",
  saveNewTime: "Cambiar a esta hora",
  cancelled: "Tu cita está cancelada.",
  moved: "Tu cita fue cambiada.",
  tooLate: (phone: string | null) =>
    `Ya es tarde para cambiar esta cita en línea. Llama a la barbería${phone ? ` al ${phone}` : ""}.`,
  notFound: "No encontramos esta cita.",
  shopNotFound: "No encontramos esta barbería.",
  errors: {
    SLOT_TAKEN: "Alguien acaba de tomar esa hora. Elige otra.",
    OUTSIDE_WINDOW: "Elige una hora al menos 30 minutos desde ahora y dentro de 30 días.",
    INVALID_INPUT: "Revisa tu nombre y número de teléfono.",
    PHONE_BLOCKED: "Este número no puede reservar en línea. Llama a la barbería.",
    UNPAID_LIMIT: "Ya tienes 2 citas por pagar en la barbería. Cancela una o llama a la barbería.",
    CUTOFF_PASSED: "Ya es tarde para cambiar esta cita en línea. Llama a la barbería.",
    BOOKING_NOT_ACTIVE: "Esta cita ya no se puede cambiar.",
    SHOP_UNAVAILABLE: "Esta barbería no está tomando citas en línea ahora.",
    NOT_FOUND: "No encontrado.",
    FORBIDDEN: "No puedes hacer eso.",
    DAY_HAS_BOOKINGS: "Hay citas ese día. Cancélalas o muévelas primero.",
    BOT_CHECK: "Completa la verificación de seguridad e intenta otra vez.",
    UNKNOWN: "Algo salió mal. Intenta otra vez.",
  },
  login: "Entrar",
  loginHint: "Te enviamos un enlace por correo. Sin contraseña.",
  email: "Correo",
  sendLink: "Enviar enlace",
  linkSent: "Revisa tu correo para entrar.",
  signOut: "Salir",
  today: "Hoy",
  prevDay: "Día anterior",
  nextDay: "Día siguiente",
  noBookings: "No hay citas este día.",
  walkIn: "Sin cita",
  logWalkIn: "Registrar cliente sin cita",
  arrived: "Llegó",
  noShow: "No vino",
  cancel: "Cancelar",
  paid: "Pagado en línea",
  payAtShop: "Paga en la barbería",
  notMember: "Esta cuenta aún no está unida a una barbería. Pide al equipo que te agregue.",
  barber: "Barbero",
  service: "Servicio",
};

export const dictionaries: Record<Locale, Dictionary> = { en, es };

export function pickLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale {
  if (cookieValue === "en" || cookieValue === "es") return cookieValue;
  const first = acceptLanguage?.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("es") ? "es" : "en";
}

/** Human cutoff like "1 hour" / "1 hora", "90 minutes". */
export function formatCutoff(minutes: number, locale: Locale): string {
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    if (locale === "es") return h === 1 ? "1 hora" : `${h} horas`;
    return h === 1 ? "1 hour" : `${h} hours`;
  }
  return locale === "es" ? `${minutes} minutos` : `${minutes} minutes`;
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0 });
}

const intlLocale = (l: Locale) => (l === "es" ? "es-US" : "en-US");

export function formatDateTime(iso: string | Date, tz: string, locale: Locale): string {
  return new Date(iso).toLocaleString(intlLocale(locale), {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDay(localDate: string, locale: Locale): string {
  // Noon UTC keeps the calendar date stable in any zone.
  return new Date(`${localDate}T12:00:00Z`).toLocaleDateString(intlLocale(locale), {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatShortDate(iso: string | Date, tz: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(intlLocale(locale), { timeZone: tz, month: "long", day: "numeric" });
}

export function formatTime(iso: string | Date, tz: string, locale: Locale): string {
  return new Date(iso).toLocaleTimeString(intlLocale(locale), { timeZone: tz, hour: "numeric", minute: "2-digit" });
}
