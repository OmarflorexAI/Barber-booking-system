-- B3/B4: client texts (Twilio), Barber alerts (Telegram + email) and the daily Owner email.

-- Texts go out in the language the Client booked in.
alter table public.bookings
  add column locale text not null default 'en' check (locale in ('en', 'es'));

-- The number a Shop texts from (its own 10DLC number). Null: the platform default number.
alter table public.shops
  add column sms_from_number text check (sms_from_number ~ '^\+[1-9][0-9]{7,14}$'),
  -- Last local day the daily Owner email covered, so the job sends it once.
  add column daily_email_last_date date;

-- One row per text sent: the per-Shop daily cap counts segments here.
create table public.sms_log (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  template text not null,
  segments integer not null check (segments > 0),
  provider_message_id text,
  sent_at timestamptz not null default now()
);
create index sms_log_shop_sent_idx on public.sms_log (shop_id, sent_at);
create index sms_log_booking_idx on public.sms_log (booking_id);

-- Telegram connection per Barber. Server-only: the link token (hashed) and chat id
-- never reach the browser.
create table public.barber_telegram (
  barber_id uuid primary key references public.barbers (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  chat_id bigint,
  link_token_hash text unique,
  link_expires_at timestamptz,
  linked_at timestamptz
);
create index barber_telegram_shop_idx on public.barber_telegram (shop_id);

do $$
declare t text;
begin
  foreach t in array array['sms_log', 'barber_telegram'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from authenticated', t);
  end loop;
end $$;
