import type { Locale } from "./dictionaries";

/** Text for the landing page that sells Barber Master to Shop Owners. */

const en = {
  metaTitle: "Barber Master: online booking for your barbershop",
  metaDescription:
    "Clients book from your link or the QR at the counter. Your barbers get an alert instead of a phone call. We set it all up for you, in Spanish and English. First month free.",
  otherLang: "Español",
  staffSignIn: "Staff sign in",

  nav: { how: "How it works", features: "Features", setup: "Setup", faq: "Questions" },
  navLabel: "Sections",
  navMenu: "Sections menu",
  heroFacts: ["Spanish and English, on every screen", "No app for your clients to download", "Set up in person, at your shop"],

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


  closingTitle: "Your chair is booked. Your phone stays in your pocket.",
  closingBody: "We set it up at your shop, in Spanish and English. The first month is on us.",


  heroTitle: "Stop answering the phone in the middle of a cut.",
  heroBody:
    "Clients book from your link or the QR code at the counter. Your barbers get an alert on their phone. We set it all up for you, in Spanish and English, and the first month is free.",
  heroCta: "Get your free month",
  heroDemo: "See a real booking page",
  heroShotAlt: "The booking page a client sees on their phone",
  navCta: "Free month",

  // The interactive phone in the hero: a pretend booking at the demo shop (nothing is saved).
  heroPhone: {
    label: "Try the booking page",
    hint: "Try it: tap a service",
    shop: "Fresh Cuts Barbershop",
    address: "1234 Grand Concourse, Bronx, NY",
    lang: "Español",
    chooseService: "Choose a service",
    from: "from",
    services: [
      { name: "Haircut", min: 30, price: 30, was: 0, special: "" },
      { name: "Skin fade", min: 45, price: 35, was: 0, special: "" },
      { name: "Beard trim", min: 15, price: 15, was: 0, special: "" },
      { name: "Haircut + beard", min: 45, price: 35, was: 40, special: "Special until November 21" },
      { name: "Kids cut (under 12)", min: 30, price: 20, was: 0, special: "" },
    ],
    back: "Back",
    chooseBarber: "Choose a barber",
    anyBarber: "Any available barber",
    anyBarberHint: "First free chair",
    barbers: ["Carlos", "Dre", "Maya", "Luis"],
    pickTime: "Pick a time",
    day: "Thu, Nov 12",
    dayShort: "Thu",
    times: ["10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM"],
    taken: [1, 4, 5, 9],
    bookedTitle: "You're booked",
    bookedWith: "with",
    bookedAt: "at",
    bookedNote: "We'll text you a reminder 2 hours before, with a link to change or cancel.",
    again: "Book another",
  },


  howTitle: "From booking to reminder, without a call",
  howShotAlt: "Choosing a time on the booking page",
  how: [
    { title: "The client books in under a minute", body: "From your link or the QR at the counter. They pick the service, the barber and a free time. No app, no account." },
    { title: "The barber gets an alert", body: "On Telegram or by email, with a link to their day. Nobody has to pick up the phone to know the schedule." },
    { title: "The client gets a reminder", body: "A text 2 hours before, with a link to cancel or change the time, so the chair doesn't sit empty." },
  ],

  howBody: "Every booking follows the same three steps, so nobody has to pick up the phone.",
  // The sticky window beside the steps: one scene per step (example data).
  howStage: {
    titles: ["booking / client", "alert / barber", "reminder / client"],
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

  featuresTitle: "What your shop gets",
  featuresPrice: "Included",
  features: [
    { title: "Pay online or at the shop", body: "The client chooses. Online payments go straight to your account, and cancelled bookings are refunded in full automatically." },
    { title: "Fewer no-shows", body: "A phone that misses two bookings in 90 days pays online to book. Nobody has to chase anyone." },
    { title: "Walk-ins still welcome", body: "Barbers log walk-ins from their day view, so the schedule stays true." },
    { title: "Know your week", body: "Bookings per week and the time you saved not answering the phone, in a short email every morning." },
    { title: "Spanish and English", body: "Every screen and every text, in the language your client uses." },
  ],

  setupTitle: "We set it up for you",
  setupBody: "You don't have to learn software. We come to the shop and do it with you.",
  setup: [
    "We visit the shop and add your services, prices, barbers and hours.",
    "We bring over your client list from your phone or notebook.",
    "You get your booking link and a QR code for the counter and the mirror.",
    "We show your barbers how to see their day, in 10 minutes.",
  ],
  setupSupport: "When something doesn't work, you text a real person who answers, in Spanish or English.",

  offerTitle: "Your first month is free",
  offer: ["No contract. Stop any time.", "Your client list is yours. Take it with you whenever you want.", "After the free month, we agree a monthly price together at the visit."],

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

  nav: { how: "Cómo funciona", features: "Funciones", setup: "Instalación", faq: "Preguntas" },
  navLabel: "Secciones",
  navMenu: "Menú de secciones",
  heroFacts: ["Español e inglés, en cada pantalla", "Tus clientes no descargan ninguna app", "Lo instalamos en persona, en tu barbería"],

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


  closingTitle: "Tu silla está reservada. Tu teléfono, en el bolsillo.",
  closingBody: "Lo instalamos en tu barbería, en español e inglés. El primer mes corre por nuestra cuenta.",


  heroTitle: "Deja de contestar el teléfono en medio de un corte.",
  heroBody:
    "Tus clientes reservan desde tu enlace o el código QR del mostrador. Tus barberos reciben un aviso en el celular. Lo configuramos todo por ti, en español e inglés, y el primer mes es gratis.",
  heroCta: "Quiero mi mes gratis",
  heroDemo: "Ver una página de citas real",
  heroShotAlt: "La página de citas que ve un cliente en su celular",
  navCta: "Mes gratis",

  heroPhone: {
    label: "Prueba la página de citas",
    hint: "Pruébala: toca un servicio",
    shop: "Fresh Cuts Barbershop",
    address: "1234 Grand Concourse, Bronx, NY",
    lang: "English",
    chooseService: "Elige un servicio",
    from: "desde",
    services: [
      { name: "Corte de pelo", min: 30, price: 30, was: 0, special: "" },
      { name: "Desvanecido", min: 45, price: 35, was: 0, special: "" },
      { name: "Arreglo de barba", min: 15, price: 15, was: 0, special: "" },
      { name: "Corte + barba", min: 45, price: 35, was: 40, special: "Oferta hasta el 21 de noviembre" },
      { name: "Corte de niño (menor de 12)", min: 30, price: 20, was: 0, special: "" },
    ],
    back: "Atrás",
    chooseBarber: "Elige un barbero",
    anyBarber: "Cualquier barbero disponible",
    anyBarberHint: "La primera silla libre",
    barbers: ["Carlos", "Dre", "Maya", "Luis"],
    pickTime: "Elige una hora",
    day: "jue, 12 nov",
    dayShort: "jue",
    times: ["10:00 a.m.", "10:30 a.m.", "11:00 a.m.", "11:30 a.m.", "1:00 p.m.", "1:30 p.m.", "2:00 p.m.", "2:30 p.m.", "3:00 p.m.", "3:30 p.m.", "4:00 p.m.", "4:30 p.m."],
    taken: [1, 4, 5, 9],
    bookedTitle: "Tu cita está lista",
    bookedWith: "con",
    bookedAt: "a las",
    bookedNote: "Te enviaremos un recordatorio 2 horas antes, con un enlace para cambiar o cancelar.",
    again: "Reservar otra",
  },


  howTitle: "De la reserva al recordatorio, sin una llamada",
  howShotAlt: "Elegir una hora en la página de citas",
  how: [
    { title: "El cliente reserva en menos de un minuto", body: "Desde tu enlace o el QR del mostrador. Elige el servicio, el barbero y una hora libre. Sin app y sin cuenta." },
    { title: "El barbero recibe un aviso", body: "Por Telegram o por correo, con un enlace a su día. Nadie tiene que contestar el teléfono para saber la agenda." },
    { title: "El cliente recibe un recordatorio", body: "Un texto 2 horas antes, con un enlace para cancelar o cambiar la hora, para que la silla no quede vacía." },
  ],

  howBody: "Cada cita sigue los mismos tres pasos, así nadie tiene que contestar el teléfono.",
  howStage: {
    titles: ["cita / cliente", "aviso / barbero", "recordatorio / cliente"],
    service: "Skin fade",
    serviceMeta: "45 min · $35",
    barber: "Con Dre · jueves",
    times: ["3:00 p.m.", "3:30 p.m.", "4:00 p.m.", "4:30 p.m.", "5:00 p.m.", "5:30 p.m."],
    picked: 2,
    taken: [1, 4],
    booked: "Reservada · jue 4:00 p.m.",
    alertFrom: "Barber Master",
    alertWhen: "ahora",
    alertTitle: "Nueva cita",
    alertBody: "Marcus · Skin fade · jue 4:00 p.m.",
    dayTitle: "El jueves de Dre",
    day: [
      { time: "2:30 p.m.", who: "Luis · Fade" },
      { time: "4:00 p.m.", who: "Marcus · Skin fade", isNew: true },
      { time: "5:00 p.m.", who: "Kevin · Barba" },
    ],
    newBadge: "Nueva",
    textFrom: "Fresh Cuts Barbershop",
    text: "Hola Marcus, tu skin fade con Dre es hoy a las 4:00 p.m. Cambia o cancela aquí: fc.bm/m/8k2",
    textSent: "Enviado 2:00 p.m., 2 horas antes",
    textActions: ["Cambiar hora", "Cancelar"],
  },

  featuresTitle: "Lo que recibe tu barbería",
  featuresPrice: "Incluido",
  features: [
    { title: "Pago en línea o en la barbería", body: "El cliente elige. Los pagos en línea van directo a tu cuenta, y las citas canceladas se reembolsan completas, solas." },
    { title: "Menos clientes que no llegan", body: "Un número que falta a dos citas en 90 días paga en línea para reservar. Nadie tiene que perseguir a nadie." },
    { title: "Los clientes sin cita, bienvenidos", body: "Los barberos anotan a los que llegan sin cita desde su día, así la agenda siempre está al día." },
    { title: "Conoce tu semana", body: "Citas por semana y el tiempo que ahorraste sin contestar el teléfono, en un correo corto cada mañana." },
    { title: "En español e inglés", body: "Cada pantalla y cada texto, en el idioma de tu cliente." },
  ],

  setupTitle: "Nosotros lo configuramos",
  setupBody: "No tienes que aprender ningún programa. Vamos a la barbería y lo hacemos contigo.",
  setup: [
    "Visitamos la barbería y agregamos tus servicios, precios, barberos y horarios.",
    "Pasamos tu lista de clientes desde tu celular o tu libreta.",
    "Recibes tu enlace de citas y un código QR para el mostrador y el espejo.",
    "Les enseñamos a tus barberos a ver su día, en 10 minutos.",
  ],
  setupSupport: "Cuando algo no funciona, le escribes a una persona de verdad que contesta, en español o inglés.",

  offerTitle: "Tu primer mes es gratis",
  offer: ["Sin contrato. Lo dejas cuando quieras.", "Tu lista de clientes es tuya. Te la llevas cuando quieras.", "Después del mes gratis, acordamos juntos un precio mensual en la visita."],

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
