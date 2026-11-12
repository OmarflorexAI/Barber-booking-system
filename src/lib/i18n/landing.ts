import type { Locale } from "./dictionaries";

/** Text for the landing page that sells Barber Master to Shop Owners. */

const en = {
  metaTitle: "Barber Master: online booking for your barbershop",
  metaDescription:
    "Clients book from your link or the QR at the counter. Your barbers get an alert instead of a phone call. We set it all up for you, in Spanish and English. First month free.",
  otherLang: "Español",
  staffSignIn: "Staff sign in",
  skipLink: "Skip to content",

  nav: { how: "How it works", setup: "Setup", pricing: "Pricing", faq: "FAQ" },
  navLabel: "Sections",
  navMenu: "Menu",
  navCta: "Talk to us",

  heroPill: "For barbershops in the Bronx & upper Manhattan",
  heroTitle: "Stop answering the phone in the middle of a cut.",
  heroBody:
    "Clients book from your link or the QR code at the counter. Your barbers get an alert on their phone. We set it all up for you, in Spanish and English, and the first month is free.",
  heroDemo: "See a real booking page",

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
    { title: "The barber gets an alert", body: "On Telegram or by email, with a link to their day. Nobody has to pick up the phone to know the schedule." },
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
    "We show your barbers how to see their day, in 10 minutes.",
  ],
  setupSupport: "When something doesn't work, you text a real person who answers, in Spanish or English.",

  // The first-month timeline.
  monthPill: "Your first month",
  monthTitle: "What the first 30 days look like",
  monthBody: "Nothing to install and nothing to pay. This is the plan for the month after our visit.",
  monthStart: "Starts here",
  month: [
    {
      when: "Day 1",
      title: "We visit, and your link goes live",
      body: "We set up your services, barbers and hours with you. Your booking link and the QR code for the counter work before we leave.",
    },
    {
      when: "Week 1",
      title: "Clients start booking from the link",
      body: "Share it on Instagram and WhatsApp and put the QR by the mirror. Each barber opens their day on their phone and sees who's next.",
    },
    {
      when: "Weeks 2–3",
      title: "Fewer bookings by phone",
      body: "As your regulars get used to the link, fewer of them tend to call to book. Walk-ins keep going on the same day view.",
    },
    {
      when: "Day 30",
      title: "You decide",
      body: "Keep going at one monthly price, agreed with you before the free month ends. Or stop, and take your client list with you.",
    },
  ],

  offerTitle: "Your first month is free",
  offerBody: "Try it at your shop for a month. Then decide.",
  plans: [
    {
      name: "First month",
      price: "Free",
      items: [
        "Setup visit at your shop",
        "Your booking link and QR code",
        "Online payments for your clients",
        "Each barber's day on their phone",
        "A short email for the owner every morning",
      ],
    },
    {
      name: "After the first month",
      price: "One monthly price",
      items: ["No contract", "Cancel anytime", "Take your client list with you", "Price agreed with you before the free month ends"],
    },
  ],

  faqTitle: "Questions owners ask",
  faq: [
    { q: "Do my clients need to download an app?", a: "No. They open a link or scan the QR code and book in their phone's browser. No account, no password." },
    { q: "Do I need a card reader?", a: "No. Clients who pay online pay on a secure page and the money goes to your account. Everyone else pays at the shop like today." },
    { q: "What about walk-ins?", a: "Keep taking them. Your barbers add them to their day in two taps, so online clients never get a time that's already taken." },
    {
      q: "How much is it after the free month?",
      a: "One monthly price, agreed with you before the free month ends. There's no contract: you can cancel anytime, and you take your client list with you.",
    },
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

  footer: "Online booking for barbershops in the Bronx and upper Manhattan.",
  footerLinks: "Legal and staff",
  privacy: "Privacy",
  terms: "Terms",
};

type LandingDictionary = typeof en;

const es: LandingDictionary = {
  metaTitle: "Barber Master: citas en línea para tu barbería",
  metaDescription:
    "Tus clientes reservan desde tu enlace o el QR del mostrador. Tus barberos reciben un aviso en vez de una llamada. Lo configuramos todo por ti, en español e inglés. El primer mes es gratis.",
  otherLang: "English",
  staffSignIn: "Entrar (personal)",
  skipLink: "Saltar al contenido",

  nav: { how: "Cómo funciona", setup: "Instalación", pricing: "Precio", faq: "Preguntas" },
  navLabel: "Secciones",
  navMenu: "Menú",
  navCta: "Hablemos",

  heroPill: "Para barberías del Bronx y el Alto Manhattan",
  heroTitle: "Deja de contestar el teléfono en medio de un corte.",
  heroBody:
    "Tus clientes reservan desde tu enlace o el código QR del mostrador. Tus barberos reciben un aviso en el celular. Lo configuramos todo por ti, en español e inglés, y el primer mes es gratis.",
  heroDemo: "Ver una página de citas real",

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

  whyTitle: "Cada llamada interrumpe un corte.",
  whyLead: "Hoy tus citas están regadas por todos lados.",
  whyBody: [
    "Llegan por teléfono, por WhatsApp, por mensajes de Instagram y en la libreta de la caja. Cada llamada obliga a un barbero a parar el corte, soltar la máquina y ver quién está libre. Mientras tanto, el cliente en la silla espera.",
    "Cuando alguien no llega, nadie se entera hasta que la silla ya está vacía. Al final de la semana cuesta saber cuántas citas entraron de verdad. Barber Master le da a cada cita un solo lugar.",
  ],

  factsLabel: "Lo que ya funciona",
  facts: [
    "Tus clientes no necesitan app ni cuenta",
    "Español e inglés en cada pantalla",
    "El cliente paga en línea o en la barbería",
    "“Cualquier barbero disponible” da la primera silla libre",
    "Los clientes sin cita van en la misma agenda del día",
    "Tu lista de clientes es tuya. Descárgala cuando quieras.",
  ],

  howTitle: "De la reserva al recordatorio, sin una llamada",
  howBody: "Cada cita sigue los mismos tres pasos, así nadie tiene que contestar el teléfono.",
  how: [
    { title: "El cliente reserva en menos de un minuto", body: "Desde tu enlace o el QR del mostrador. Elige el servicio, el barbero y una hora libre. Sin app y sin cuenta." },
    { title: "El barbero recibe un aviso", body: "Por Telegram o por correo, con un enlace a su día. Nadie tiene que contestar el teléfono para saber la agenda." },
    { title: "El cliente recibe un recordatorio", body: "Un texto 2 horas antes, con un enlace para cancelar o cambiar la hora, para que la silla no quede vacía." },
  ],
  howStage: {
    service: "Desvanecido",
    serviceMeta: "45 min · $35",
    barber: "Con Dre · jueves",
    times: ["3:00 p.m.", "3:30 p.m.", "4:00 p.m.", "4:30 p.m.", "5:00 p.m.", "5:30 p.m."],
    picked: 2,
    taken: [1, 4],
    booked: "Reservada · jue 4:00 p.m.",
    alertFrom: "Barber Master",
    alertWhen: "ahora",
    alertTitle: "Nueva cita",
    alertBody: "Marcus · Desvanecido · jue 4:00 p.m.",
    dayTitle: "El jueves de Dre",
    day: [
      { time: "2:30 p.m.", who: "Luis · Fade" },
      { time: "4:00 p.m.", who: "Marcus · Desvanecido", isNew: true },
      { time: "5:00 p.m.", who: "Kevin · Barba" },
    ],
    newBadge: "Nueva",
    textFrom: "Fresh Cuts Barbershop",
    text: "Hola Marcus, tu desvanecido con Dre es hoy a las 4:00 p.m. Cambia o cancela aquí: fc.bm/m/8k2",
    textSent: "Enviado 2:00 p.m., 2 horas antes",
    textActions: ["Cambiar hora", "Cancelar"],
  },

  setupTitle: "Nosotros lo configuramos",
  setupBody: "No tienes que aprender ningún programa. Vamos a la barbería y lo hacemos contigo.",
  setupCards: [
    { title: "Vamos a tu barbería", steps: [0, 1] },
    { title: "Tu enlace funciona el mismo día", steps: [2, 3] },
  ],
  setup: [
    "Visitamos la barbería y agregamos tus servicios, precios, barberos y horarios.",
    "Pasamos tu lista de clientes desde tu celular o tu libreta.",
    "Recibes tu enlace de citas y un código QR para el mostrador y el espejo.",
    "Les enseñamos a tus barberos a ver su día, en 10 minutos.",
  ],
  setupSupport: "Cuando algo no funciona, le escribes a una persona de verdad que contesta, en español o inglés.",

  monthPill: "Tu primer mes",
  monthTitle: "Cómo son los primeros 30 días",
  monthBody: "Nada que instalar y nada que pagar. Este es el plan para el mes después de nuestra visita.",
  monthStart: "Aquí empieza",
  month: [
    {
      when: "Día 1",
      title: "Te visitamos y tu enlace queda activo",
      body: "Configuramos contigo tus servicios, barberos y horarios. Tu enlace de citas y el QR del mostrador funcionan antes de que nos vayamos.",
    },
    {
      when: "Semana 1",
      title: "Los clientes empiezan a reservar con el enlace",
      body: "Compártelo en Instagram y WhatsApp y pon el QR junto al espejo. Cada barbero abre su día en el celular y ve quién sigue.",
    },
    {
      when: "Semanas 2–3",
      title: "Menos citas por teléfono",
      body: "A medida que tus clientes de siempre se acostumbran al enlace, menos de ellos suelen llamar para reservar. Los clientes sin cita siguen en la misma agenda del día.",
    },
    {
      when: "Día 30",
      title: "Tú decides",
      body: "Sigues con un precio mensual, acordado contigo antes de que termine el mes gratis. O lo dejas y te llevas tu lista de clientes.",
    },
  ],

  offerTitle: "Tu primer mes es gratis",
  offerBody: "Pruébalo un mes en tu barbería. Después decides.",
  plans: [
    {
      name: "Primer mes",
      price: "Gratis",
      items: [
        "Visita de instalación en tu barbería",
        "Tu enlace de citas y código QR",
        "Pagos en línea para tus clientes",
        "El día de cada barbero en su celular",
        "Un correo corto para el dueño cada mañana",
      ],
    },
    {
      name: "Después del primer mes",
      price: "Un precio mensual",
      items: ["Sin contrato", "Cancelas cuando quieras", "Te llevas tu lista de clientes", "Precio acordado contigo antes de que termine el mes gratis"],
    },
  ],

  faqTitle: "Lo que preguntan los dueños",
  faq: [
    { q: "¿Mis clientes tienen que bajar una app?", a: "No. Abren un enlace o escanean el QR y reservan en el navegador del celular. Sin cuenta y sin contraseña." },
    { q: "¿Necesito una máquina para tarjetas?", a: "No. Quien paga en línea lo hace en una página segura y el dinero llega a tu cuenta. Los demás pagan en la barbería como hoy." },
    { q: "¿Y los clientes que llegan sin cita?", a: "Sigue atendiéndolos. Tus barberos los agregan a su día con dos toques, así nadie reserva en línea una hora ya ocupada." },
    {
      q: "¿Cuánto cuesta después del mes gratis?",
      a: "Un precio mensual, acordado contigo antes de que termine el mes gratis. No hay contrato: cancelas cuando quieras y te llevas tu lista de clientes.",
    },
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

  footer: "Citas en línea para barberías del Bronx y el Alto Manhattan.",
  footerLinks: "Legal y personal",
  privacy: "Privacidad",
  terms: "Términos",
};

export const landingDictionaries: Record<Locale, LandingDictionary> = { en, es };
export type { LandingDictionary };
