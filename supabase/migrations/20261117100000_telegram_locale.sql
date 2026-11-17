-- The language of a Barber's Telegram alerts. Set when the chat links with "/start <token>",
-- from the language of the Telegram app that sent it ('es' for any Spanish, else 'en').
-- Server-only like the rest of the table (RLS on, no policies).
alter table public.barber_telegram
  add column locale text not null default 'en' check (locale in ('en', 'es'));
