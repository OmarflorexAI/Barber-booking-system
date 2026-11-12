import type { Locale } from "./dictionaries";

/**
 * The /privacy and /terms pages (and /es/privacy, /es/terms), in plain language, plus the
 * bilingual 404. A draft written with the user on 2026-11-12 (progress.md, "L4 grill
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
export const LAST_UPDATED = { en: "November 12, 2026", es: "12 de noviembre de 2026" } as const;

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
  /** The link to the same page in the other language, written in that language. */
  otherLang: string;
  privacy: LegalPage;
  terms: LegalPage;
};

/** Each legal page's URL in each language. */
export const legalPaths: Record<LegalPageKey, Record<Locale, string>> = {
  privacy: { en: "/privacy", es: "/es/privacy" },
  terms: { en: "/terms", es: "/es/terms" },
};

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
  otherLang: "Leer en español",
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

const es: LegalDictionary = {
  updated: "Última actualización",
  contactLabel: "Contacto",
  contactBody: "¿Preguntas sobre esta página o tus datos? Escríbenos:",
  back: "Inicio de Barber Master",
  skipLink: "Saltar al contenido",
  otherLang: "Read in English",
  privacy: {
    title: "Privacidad",
    metaDescription: "Qué datos guarda Barber Master, para qué, quién nos ayuda a manejarlo y cómo pedir que se borren.",
    intro: `${OPERATOR} ("nosotros") ofrece reservas en línea para barberías. Esta página explica qué datos guardamos, para qué y qué opciones tienes. Es corta, y no vendemos tus datos.`,
    sections: [
      {
        heading: "Quién es responsable de tus datos",
        body: [
          "Si reservaste un corte, tus datos pertenecen a la barbería donde reservaste (la Barbería). Los guardamos y usamos solo para manejar las citas de esa Barbería, en su nombre. Las preguntas sobre tus citas van primero a la Barbería; nosotros la ayudamos a responder.",
          "Si eres dueño de una barbería o barbero, o nos escribiste desde nuestra página web, nosotros somos responsables de tus datos.",
        ],
      },
      {
        heading: "Qué datos guardamos",
        body: [
          "Clientes: tu nombre, tu número de celular y tus citas (servicio, barbero, hora, estado y si pagaste en línea). No pedimos correo electrónico ni te creamos una cuenta.",
          "Pagos: si pagas en línea, el pago con tarjeta lo maneja nuestro procesador de pagos. Nunca vemos ni guardamos el número de tu tarjeta; solo guardamos el estado y el monto del pago.",
          "Dueños y barberos: tu nombre, el correo con el que inicias sesión, los datos de tu barbería y, si un barbero lo conecta, el chat de Telegram que recibe los avisos de citas.",
          "Formulario de contacto de la web: tu nombre, el nombre de tu barbería, tu teléfono y lo que quieras escribirnos.",
          "Datos técnicos: registros básicos (como la dirección IP y el tipo de navegador) que nuestros proveedores guardan para que el servicio funcione y esté protegido.",
        ],
      },
      {
        heading: "Para qué los usamos",
        body: [
          "Para hacer, cambiar y cancelar citas, y para mostrarle a la Barbería su agenda.",
          "Para enviar los mensajes y avisos de citas que se explican abajo.",
          "Para procesar pagos en línea y reembolsos.",
          "Para responderte cuando nos escribes, y para mantener el servicio seguro y funcionando.",
          "No usamos tus datos para publicidad, y no los vendemos ni alquilamos a nadie.",
        ],
      },
      {
        heading: "Mensajes de texto",
        body: [
          "Al reservar, aceptas recibir un mensaje de confirmación y un recordatorio unas 2 horas antes de tu cita (normalmente 2 mensajes por cita), y un mensaje si la Barbería cancela o cambia tu cita. Pueden aplicarse tarifas de mensajes y datos.",
          "Responde STOP a cualquier mensaje para no recibir más, o HELP para pedir ayuda. También puedes escribirnos.",
          "Tu número de celular y tu permiso para recibir mensajes nunca se comparten ni se venden a terceros para su publicidad.",
        ],
      },
      {
        heading: "Quién nos ayuda a manejar el servicio",
        body: [
          "Usamos proveedores de confianza que manejan los datos solo para darnos su servicio: Supabase (base de datos), Twilio (mensajes de texto), Resend (correo), Telegram (avisos a barberos), Stripe (pagos en línea), Cloudflare Turnstile (verificación contra bots en nuestros formularios) y nuestro proveedor de hosting.",
          "También podemos compartir datos si la ley lo exige, o para proteger la seguridad de las personas o del servicio.",
        ],
      },
      {
        heading: "Cookies",
        body: [
          "Usamos solo las cookies que el servicio necesita: una recuerda tu idioma, otra mantiene la sesión del personal, y nuestros proveedores de verificación y de pagos usan las suyas para funcionar de forma segura. No usamos cookies de publicidad ni de seguimiento.",
        ],
      },
      {
        heading: "Cuánto tiempo los guardamos",
        body: [
          "Guardamos los datos de una Barbería mientras use Barber Master. Si la Barbería cancela, puede descargar su lista de clientes, y borramos sus datos 30 días después.",
          "Los mensajes del formulario de contacto se guardan mientras estemos en contacto y se borran cuando ya no hacen falta. Nuestros proveedores pueden guardar copias de seguridad y registros por un tiempo limitado.",
        ],
      },
      {
        heading: "Tus opciones",
        body: [
          "Puedes pedir ver, corregir o borrar tus datos. Los clientes también pueden pedírselo directamente a la Barbería. Escríbenos a la dirección de abajo y te responderemos en un máximo de 30 días.",
        ],
      },
      {
        heading: "Menores",
        body: ["El servicio no está pensado para menores de 13 años, y no guardamos sus datos a sabiendas."],
      },
      {
        heading: "Seguridad",
        body: [
          "Los datos viajan por conexiones cifradas, solo tiene acceso quien lo necesita, y cada vez que nuestro equipo de soporte entra a los datos de una Barbería queda registrado.",
        ],
      },
      {
        heading: "Cambios",
        body: ["Si cambiamos esta página, actualizaremos la fecha de arriba. Si el cambio es importante, avisaremos a los dueños de barberías antes de que entre en vigor."],
      },
    ],
  },
  terms: {
    title: "Términos",
    metaDescription: "Las reglas para usar Barber Master: citas, mensajes, pagos y reembolsos, y de qué se encarga cada parte.",
    intro: `Estos términos aplican cuando usas Barber Master, el servicio de reservas de ${OPERATOR} ("nosotros"). Al reservar una cita o usar el servicio para tu barbería, los aceptas.`,
    sections: [
      {
        heading: "El servicio",
        body: [
          "Barber Master permite a los clientes reservar citas en barberías (Barberías) por internet, y a las Barberías manejar esas citas. La Barbería, no Barber Master, es quien da el corte y cualquier otro servicio que reserves, y quien pone sus precios, horarios y reglas.",
        ],
      },
      {
        heading: "Reservar como cliente",
        body: [
          "Usa tu nombre real y un número de celular donde recibas mensajes. Una reserva es una cita con la Barbería a la hora indicada; llega a tiempo, por favor.",
          "Puedes cancelar o cambiar tu cita desde el enlace de tus mensajes hasta la hora límite de la Barbería. Después de esa hora, llama a la Barbería.",
          "Una Barbería puede rechazar o cancelar una cita, por ejemplo si tiene que cerrar.",
        ],
      },
      {
        heading: "Mensajes",
        body: [
          "Los mensajes de una cita son una confirmación, un recordatorio unas 2 horas antes y avisos si tu cita cambia (normalmente 2 mensajes por cita). Pueden aplicarse tarifas de mensajes y datos. Responde STOP para no recibir más, HELP para ayuda. Las compañías telefónicas no son responsables de mensajes retrasados o no entregados.",
        ],
      },
      {
        heading: "Pagos en línea y reembolsos",
        body: [
          "Algunas Barberías te dejan pagar en línea al reservar. El pago va a la Barbería, a través de nuestro procesador de pagos. Tu hora se guarda 10 minutos mientras pagas; si el pago no se completa, la hora se libera.",
          "Si cancelas a tiempo, o si la Barbería cancela, recibes el reembolso completo en la misma tarjeta. Un pago que llega después de que venció la reserva de la hora se reembolsa automáticamente. Si cambias la hora de tu cita, tu pago pasa a la nueva hora. Los reembolsos pueden tardar unos días hábiles en aparecer.",
          "Pagar en la barbería es un acuerdo entre tú y la Barbería.",
        ],
      },
      {
        heading: "Para las Barberías",
        body: [
          "El primer mes es gratis. Después, el servicio cuesta un solo precio mensual que acordamos contigo en persona, sin contrato: puedes cancelar cuando quieras.",
          "Mantén al día tus servicios, precios, horarios y barberos, y da acceso solo a las personas que trabajan en tu barbería.",
          "Tu lista de clientes es tuya. Si cancelas, puedes descargarla, y borramos los datos de tu barbería 30 días después.",
          "Usa los números de tus clientes solo para las citas, como explica nuestra página de Privacidad, y cumple las reglas de mensajes que te apliquen.",
        ],
      },
      {
        heading: "Uso justo",
        body: [
          "No hagas mal uso del servicio: nada de citas falsas, ni intentar entrar sin permiso o sobrecargarlo, ni usarlo para enviar spam o algo ilegal. Podemos bloquear números o cuentas que lo hagan.",
        ],
      },
      {
        heading: "Disponibilidad",
        body: [
          "Trabajamos para que Barber Master funcione siempre, pero no podemos prometer que nunca se interrumpa. Si algo sale mal con una cita, contacta a la Barbería o a nosotros y te ayudamos a resolverlo.",
        ],
      },
      {
        heading: "Responsabilidad",
        body: [
          "El servicio se ofrece tal como está. En la medida en que la ley lo permita, no somos responsables de pérdidas indirectas ni de los servicios que dan las Barberías. Nada en estos términos limita los derechos que la ley te da y que no se pueden limitar.",
        ],
      },
      {
        heading: "Ley aplicable",
        body: ["Estos términos se rigen por las leyes del Estado de Nueva York."],
      },
      {
        heading: "Cambios",
        body: ["Si cambiamos estos términos, actualizaremos la fecha de arriba. Si el cambio es importante, avisaremos a los dueños de barberías antes de que entre en vigor."],
      },
    ],
  },
};

export const legalDictionaries: Record<Locale, LegalDictionary> = { en, es };
