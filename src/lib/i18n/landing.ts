import type { Locale } from "./dictionaries";

/** Text for the landing page that sells Barber Master to Shop Owners. */

const en = {
  metaTitle: "Barber Master: online booking for your barbershop",
  metaDescription:
    "Clients book from your link or the QR at the counter. Your barbers get an alert instead of a phone call. We set it all up for you, in Spanish and English. First month free.",
  otherLang: "Español",
  staffSignIn: "Staff sign in",

  nav: { how: "How it works", features: "Features", setup: "Setup", styles: "Styles", faq: "Questions" },
  navLabel: "Sections",
  navMenu: "Sections menu",
  heroLabel: "Online booking for barbershops",
  heroTrust: "In Spanish and English. No app for your clients.",

  // Small UI cards floating in the hero and feature visuals.
  cards: {
    newBooking: "New booking",
    newBookingValue: "Dre · Skin fade · 3:30 PM",
    paid: "Paid online",
    paidValue: "$35.00",
    reminder: "Reminder sent",
    reminderValue: "Ana · today 1:30 PM",
    walkIn: "Walk-in",
    walkInValue: "Carlos · Haircut",
    week: "This week",
    weekValue: "64 bookings · 5.3 h saved",
    // How it works: what the barber and the client each get.
    barberAlert: "Alert for Dre",
    barberAlertValue: "Marcus · Thu 4:00 PM",
    clientText: "Text to Marcus",
    clientTextValue: "Tomorrow, 4:00 PM",
  },

  // Example data inside the feature visuals (clearly illustrative).
  demo: {
    ledger: [
      { who: "Luis · Fade", amount: "$35.00", status: "Paid online" },
      { who: "Kevin · Beard trim", amount: "$15.00", status: "Pays at the shop" },
      { who: "Marcus · Haircut", amount: "$30.00", status: "Cancelled · refunded" },
    ],
    missed: "Missed",
    noShowRule: "Next booking: pays online",
    walkInNow: "Walk-in added",
    walkInValue: "Carlos · Haircut · now",
    textMessage: "Hi Ana, your haircut with Dre is today at 1:30 PM. Reply C to cancel.",
  },

  values: [
    { title: "Clients book themselves", body: "From your link or the counter QR, any hour, in under a minute." },
    { title: "Barbers keep cutting", body: "An alert on their phone replaces the call." },
    { title: "Fewer empty chairs", body: "Reminders with a cancel link, and a no-show rule." },
    { title: "Done for you", body: "We set it up at the shop, in Spanish and English." },
  ],

  closingLabel: "When you're ready",
  closingGallery: "See the styles",
  closingTitle: "Your chair is booked. Your phone stays in your pocket.",
  closingBody: "We set it up at your shop, in Spanish and English. The first month is on us.",

  galleryLabel: "The work",
  galleryTitle: "Show clients the cut before they book it.",
  galleryBody: "Each barber's profile shows their best work. Drag a head to turn it around.",
  galleryHint: "Drag to turn",
  galleryKeys: "or use the arrow keys",
  galleryLoading: "Loading the 360° view",
  galleryPicker: "Haircut styles",

  heroTitle: "Stop answering the phone in the middle of a cut.",
  heroBody:
    "Clients book from your link or the QR code at the counter. Your barbers get an alert on their phone. We set it all up for you, in Spanish and English, and the first month is free.",
  heroCta: "Get your free month",
  heroDemo: "See a real booking page",
  heroShotAlt: "The booking page a client sees on their phone",
  navCta: "Free month",

  problemLabel: "The counter today",
  problemTitle: "Right now, the book runs your day",
  problem: [
    { quote: "“Hold on, let me check the book.”", body: "Every call, text and Instagram message stops a cut. Your barber puts down the clippers to answer." },
    { quote: "“He said 3? I wrote 4.”", body: "The notebook, WhatsApp and memory never agree. Two clients show up for the same chair." },
    { quote: "“Nobody came at 11.”", body: "No-shows leave an empty chair and there's no reminder that would have stopped it." },
  ],

  howTitle: "From booking to reminder, without a call",
  howShotAlt: "Choosing a time on the booking page",
  how: [
    { title: "The client books in under a minute", body: "From your link or the QR at the counter. They pick the service, the barber and a free time. No app, no account." },
    { title: "The barber gets an alert", body: "On Telegram or by email, with a link to their day. Nobody has to pick up the phone to know the schedule." },
    { title: "The client gets a reminder", body: "A text 2 hours before, with a link to cancel or change the time, so the chair doesn't sit empty." },
  ],

  featuresLabel: "Included from day one",
  featuresTitle: "What your shop gets",
  features: [
    { title: "Pay online or at the shop", body: "The client chooses. Online payments go straight to your account, and cancelled bookings are refunded in full automatically." },
    { title: "Fewer no-shows", body: "A phone that misses two bookings in 90 days pays online to book. Nobody has to chase anyone." },
    { title: "Walk-ins still welcome", body: "Barbers log walk-ins from their day view, so the schedule stays true." },
    { title: "Know your week", body: "Bookings per week and the time you saved not answering the phone, in a short email every morning." },
    { title: "Spanish and English", body: "Every screen and every text, in the language your client uses." },
  ],

  setupLabel: "One visit to your shop",
  setupTitle: "We set it up for you",
  setupBody: "You don't have to learn software. We come to the shop and do it with you.",
  setup: [
    "We visit the shop and add your services, prices, barbers and hours.",
    "We bring over your client list from your phone or notebook.",
    "You get your booking link and a QR code for the counter and the mirror.",
    "We show your barbers how to see their day, in 10 minutes.",
  ],
  setupSupport: "When something doesn't work, you text a real person who answers, in Spanish or English.",

  offerLabel: "The offer",
  offerTitle: "Your first month is free",
  offer: ["No contract. Stop any time.", "Your client list is yours. Take it with you whenever you want.", "After the free month, we agree a monthly price together at the visit."],

  faqLabel: "Before you call",
  faqTitle: "Questions owners ask",
  faq: [
    { q: "Do my clients need to download an app?", a: "No. They open a link or scan the QR code and book in their phone's browser. No account, no password." },
    { q: "Do I need a card reader?", a: "No. Clients who pay online pay on a secure page and the money goes to your account. Everyone else pays at the shop like today." },
    { q: "What about walk-ins?", a: "Keep taking them. Your barbers add them to their day in two taps, so online clients never get a time that's already taken." },
    { q: "How much is it after the free month?", a: "A small monthly fee, agreed at the visit. You'll know the price before the free month ends, and you can stop with no charge." },
    { q: "Who sees my clients' information?", a: "Only your shop. We never sell it or use it to advertise, and we never store card numbers." },
  ],

  formTitle: "Get your free month",
  formBody: "Leave your number and we'll call or text you within a day to set up a visit.",
  shopName: "Shop name",
  ownerName: "Your name",
  phone: "Mobile phone",
  neighborhood: "Neighborhood",
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

  footer: "Barber Master. Online booking for barbershops in the Bronx and upper Manhattan.",
};

type LandingDictionary = typeof en;

const es: LandingDictionary = {
  metaTitle: "Barber Master: citas en línea para tu barbería",
  metaDescription:
    "Tus clientes reservan desde tu enlace o el QR del mostrador. Tus barberos reciben un aviso en vez de una llamada. Lo configuramos todo por ti, en español e inglés. El primer mes es gratis.",
  otherLang: "English",
  staffSignIn: "Entrar (personal)",

  nav: { how: "Cómo funciona", features: "Funciones", setup: "Instalación", styles: "Estilos", faq: "Preguntas" },
  navLabel: "Secciones",
  navMenu: "Menú de secciones",
  heroLabel: "Citas en línea para barberías",
  heroTrust: "En español e inglés. Tus clientes no necesitan app.",

  cards: {
    newBooking: "Nueva cita",
    newBookingValue: "Dre · Skin fade · 3:30 p.m.",
    paid: "Pagado en línea",
    paidValue: "$35.00",
    reminder: "Recordatorio enviado",
    reminderValue: "Ana · hoy 1:30 p.m.",
    walkIn: "Sin cita",
    walkInValue: "Carlos · Corte",
    week: "Esta semana",
    weekValue: "64 citas · 5.3 h ahorradas",
    barberAlert: "Aviso para Dre",
    barberAlertValue: "Marcus · jue 4:00 p.m.",
    clientText: "Texto a Marcus",
    clientTextValue: "Mañana, 4:00 p.m.",
  },

  demo: {
    ledger: [
      { who: "Luis · Fade", amount: "$35.00", status: "Pagado en línea" },
      { who: "Kevin · Barba", amount: "$15.00", status: "Paga en la barbería" },
      { who: "Marcus · Corte", amount: "$30.00", status: "Cancelada · reembolsada" },
    ],
    missed: "No vino",
    noShowRule: "Próxima cita: paga en línea",
    walkInNow: "Sin cita, anotado",
    walkInValue: "Carlos · Corte · ahora",
    textMessage: "Hola Ana, tu corte con Dre es hoy a la 1:30 p.m. Responde C para cancelar.",
  },

  values: [
    { title: "Los clientes reservan solos", body: "Desde tu enlace o el QR del mostrador, a cualquier hora, en menos de un minuto." },
    { title: "Los barberos siguen cortando", body: "Un aviso en el celular reemplaza la llamada." },
    { title: "Menos sillas vacías", body: "Recordatorios con enlace para cancelar, y una regla para los que no llegan." },
    { title: "Lo hacemos por ti", body: "Lo instalamos en la barbería, en español e inglés." },
  ],

  closingLabel: "Cuando quieras",
  closingGallery: "Ver los estilos",
  closingTitle: "Tu silla está reservada. Tu teléfono, en el bolsillo.",
  closingBody: "Lo instalamos en tu barbería, en español e inglés. El primer mes corre por nuestra cuenta.",

  galleryLabel: "El trabajo",
  galleryTitle: "Enséñale el corte al cliente antes de que lo reserve.",
  galleryBody: "El perfil de cada barbero muestra su mejor trabajo. Arrastra una cabeza para girarla.",
  galleryHint: "Arrastra para girar",
  galleryKeys: "o usa las flechas",
  galleryLoading: "Cargando la vista 360°",
  galleryPicker: "Estilos de corte",

  heroTitle: "Deja de contestar el teléfono en medio de un corte.",
  heroBody:
    "Tus clientes reservan desde tu enlace o el código QR del mostrador. Tus barberos reciben un aviso en el celular. Lo configuramos todo por ti, en español e inglés, y el primer mes es gratis.",
  heroCta: "Quiero mi mes gratis",
  heroDemo: "Ver una página de citas real",
  heroShotAlt: "La página de citas que ve un cliente en su celular",
  navCta: "Mes gratis",

  problemLabel: "El mostrador hoy",
  problemTitle: "Hoy, la libreta manda en tu día",
  problem: [
    { quote: "“Espérame, déjame ver la libreta.”", body: "Cada llamada, texto o mensaje de Instagram interrumpe un corte. Tu barbero suelta la máquina para contestar." },
    { quote: "“¿Dijo a las 3? Yo apunté a las 4.”", body: "La libreta, WhatsApp y la memoria nunca coinciden. Llegan dos clientes para la misma silla." },
    { quote: "“A las 11 no vino nadie.”", body: "Los que no llegan dejan la silla vacía, y no hubo un recordatorio que lo evitara." },
  ],

  howTitle: "De la reserva al recordatorio, sin una llamada",
  howShotAlt: "Elegir una hora en la página de citas",
  how: [
    { title: "El cliente reserva en menos de un minuto", body: "Desde tu enlace o el QR del mostrador. Elige el servicio, el barbero y una hora libre. Sin app y sin cuenta." },
    { title: "El barbero recibe un aviso", body: "Por Telegram o por correo, con un enlace a su día. Nadie tiene que contestar el teléfono para saber la agenda." },
    { title: "El cliente recibe un recordatorio", body: "Un texto 2 horas antes, con un enlace para cancelar o cambiar la hora, para que la silla no quede vacía." },
  ],

  featuresLabel: "Incluido desde el primer día",
  featuresTitle: "Lo que recibe tu barbería",
  features: [
    { title: "Pago en línea o en la barbería", body: "El cliente elige. Los pagos en línea van directo a tu cuenta, y las citas canceladas se reembolsan completas, solas." },
    { title: "Menos clientes que no llegan", body: "Un número que falta a dos citas en 90 días paga en línea para reservar. Nadie tiene que perseguir a nadie." },
    { title: "Los clientes sin cita, bienvenidos", body: "Los barberos anotan a los que llegan sin cita desde su día, así la agenda siempre está al día." },
    { title: "Conoce tu semana", body: "Citas por semana y el tiempo que ahorraste sin contestar el teléfono, en un correo corto cada mañana." },
    { title: "En español e inglés", body: "Cada pantalla y cada texto, en el idioma de tu cliente." },
  ],

  setupLabel: "Una visita a tu barbería",
  setupTitle: "Nosotros lo configuramos",
  setupBody: "No tienes que aprender ningún programa. Vamos a la barbería y lo hacemos contigo.",
  setup: [
    "Visitamos la barbería y agregamos tus servicios, precios, barberos y horarios.",
    "Pasamos tu lista de clientes desde tu celular o tu libreta.",
    "Recibes tu enlace de citas y un código QR para el mostrador y el espejo.",
    "Les enseñamos a tus barberos a ver su día, en 10 minutos.",
  ],
  setupSupport: "Cuando algo no funciona, le escribes a una persona de verdad que contesta, en español o inglés.",

  offerLabel: "La oferta",
  offerTitle: "Tu primer mes es gratis",
  offer: ["Sin contrato. Lo dejas cuando quieras.", "Tu lista de clientes es tuya. Te la llevas cuando quieras.", "Después del mes gratis, acordamos juntos un precio mensual en la visita."],

  faqLabel: "Antes de llamar",
  faqTitle: "Lo que preguntan los dueños",
  faq: [
    { q: "¿Mis clientes tienen que bajar una app?", a: "No. Abren un enlace o escanean el QR y reservan en el navegador del celular. Sin cuenta y sin contraseña." },
    { q: "¿Necesito una máquina para tarjetas?", a: "No. Quien paga en línea lo hace en una página segura y el dinero llega a tu cuenta. Los demás pagan en la barbería como hoy." },
    { q: "¿Y los clientes que llegan sin cita?", a: "Sigue atendiéndolos. Tus barberos los agregan a su día con dos toques, así nadie reserva en línea una hora ya ocupada." },
    { q: "¿Cuánto cuesta después del mes gratis?", a: "Una cuota mensual pequeña, que acordamos en la visita. Sabrás el precio antes de que termine el mes gratis y puedes dejarlo sin pagar nada." },
    { q: "¿Quién ve los datos de mis clientes?", a: "Solo tu barbería. Nunca los vendemos ni los usamos para publicidad, y nunca guardamos números de tarjeta." },
  ],

  formTitle: "Quiero mi mes gratis",
  formBody: "Déjanos tu número y te llamamos o escribimos en un día para acordar la visita.",
  shopName: "Nombre de la barbería",
  ownerName: "Tu nombre",
  phone: "Celular",
  neighborhood: "Barrio",
  optional: "opcional",
  barbers: "Barberos en la barbería",
  barbersPick: "Elige…",
  barbersMore: "7 o más",
  message: "¿Algo que debamos saber?",
  messageHint: "Por ejemplo: cómo tomas las citas hoy.",
  send: "Enviar",
  sending: "Enviando…",
  verifying: "Verificando que no eres un robot…",
  thanksTitle: "Gracias, lo recibimos.",
  thanksBody: "Te llamamos o escribimos en un día para acordar la visita.",
  errors: {
    INVALID_INPUT: "Escribe el nombre de tu barbería y tu nombre.",
    INVALID_PHONE: "Ese número no parece correcto. Usa un número de EE. UU. de 10 dígitos.",
    BOT_CHECK: "La verificación no terminó. Espera un momento y pulsa Enviar otra vez.",
    UNKNOWN: "No se pudo enviar. Inténtalo de nuevo o escríbenos.",
  },

  footer: "Barber Master. Citas en línea para barberías del Bronx y el Alto Manhattan.",
};

export const landingDictionaries: Record<Locale, LandingDictionary> = { en, es };
export type { LandingDictionary };
