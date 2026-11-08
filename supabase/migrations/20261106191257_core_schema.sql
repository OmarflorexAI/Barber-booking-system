-- Core schema for Barber Booking (Phase 1).
-- Every tenant table carries shop_id. Composite foreign keys (shop_id, id)
-- make it impossible for a row in one Shop to point at a row in another.

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------- shops
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  phone text,
  address text,
  timezone text not null default 'America/New_York'
    check (timezone = 'America/New_York'),
  cancel_cutoff_minutes integer not null default 60
    check (cancel_cutoff_minutes between 0 and 10080),
  manual_booking_minutes integer not null default 0
    check (manual_booking_minutes >= 0),
  sms_enabled boolean not null default false,
  stripe_account_id text,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'cancelled')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- people
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.shop_members (
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'barber')),
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);
create index shop_members_user_idx on public.shop_members (user_id);

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null,
  bio text not null default '',
  photo_url text,
  specialties text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (shop_id, id),
  unique (shop_id, user_id)
);

create table public.barber_gallery (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null,
  barber_id uuid not null,
  url text not null,
  position integer not null default 0,
  foreign key (shop_id, barber_id) references public.barbers (shop_id, id) on delete cascade
);
create index barber_gallery_barber_idx on public.barber_gallery (barber_id);

-- ---------------------------------------------------------------- services
create table public.services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name_en text not null,
  name_es text not null,
  duration_min integer not null check (duration_min > 0 and duration_min % 15 = 0),
  buffer_min integer not null default 0 check (buffer_min >= 0 and buffer_min <= 120),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (shop_id, id)
);

-- Price (and optional duration override) per Barber. Barbers cannot write this table.
create table public.barber_services (
  shop_id uuid not null,
  barber_id uuid not null,
  service_id uuid not null,
  price_cents integer not null check (price_cents >= 0),
  duration_override_min integer
    check (duration_override_min is null or (duration_override_min > 0 and duration_override_min % 15 = 0)),
  special_price_cents integer check (special_price_cents is null or special_price_cents >= 0),
  special_ends_at timestamptz,
  primary key (barber_id, service_id),
  foreign key (shop_id, barber_id) references public.barbers (shop_id, id) on delete cascade,
  foreign key (shop_id, service_id) references public.services (shop_id, id) on delete cascade,
  check ((special_price_cents is null) = (special_ends_at is null))
);
create index barber_services_service_idx on public.barber_services (service_id);
create index barber_services_shop_idx on public.barber_services (shop_id);

-- ---------------------------------------------------------------- schedule
-- Local wall-clock times in the Shop's time zone. weekday: 0 = Sunday .. 6 = Saturday.
create table public.weekly_hours (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null,
  barber_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  break_start time,
  break_end time,
  foreign key (shop_id, barber_id) references public.barbers (shop_id, id) on delete cascade,
  unique (barber_id, weekday),
  check (start_time < end_time),
  check ((break_start is null) = (break_end is null)),
  check (break_start is null or (start_time < break_start and break_start < break_end and break_end < end_time)),
  check (extract(minute from start_time)::int % 15 = 0 and extract(minute from end_time)::int % 15 = 0)
);
create index weekly_hours_shop_idx on public.weekly_hours (shop_id);

create table public.barber_time_off (
  shop_id uuid not null,
  barber_id uuid not null,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (barber_id, day),
  foreign key (shop_id, barber_id) references public.barbers (shop_id, id) on delete cascade
);
create index barber_time_off_shop_idx on public.barber_time_off (shop_id);

create table public.shop_closed_days (
  shop_id uuid not null references public.shops (id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (shop_id, day)
);

-- ---------------------------------------------------------------- clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  blocked boolean not null default false,
  sms_opt_out boolean not null default false,
  created_at timestamptz not null default now(),
  unique (shop_id, phone_e164),
  unique (shop_id, id)
);

-- ---------------------------------------------------------------- bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  barber_id uuid not null,
  service_id uuid not null,
  client_id uuid,
  kind text not null default 'booking' check (kind in ('booking', 'walk_in')),
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled', 'arrived', 'no_show')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  blocked_until timestamptz not null,
  price_cents integer not null check (price_cents >= 0),
  payment_method text not null default 'in_person' check (payment_method in ('in_person', 'online')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  manage_token_hash text unique,
  cancelled_by text check (cancelled_by in ('client', 'barber', 'owner', 'admin')),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (shop_id, barber_id) references public.barbers (shop_id, id) on delete cascade,
  foreign key (shop_id, service_id) references public.services (shop_id, id) on delete cascade,
  foreign key (shop_id, client_id) references public.clients (shop_id, id) on delete cascade,
  check (starts_at < ends_at and ends_at <= blocked_until),
  check (kind = 'walk_in' or client_id is not null),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  -- The no-double-booking guarantee. Two live Bookings for one Barber can never overlap.
  constraint bookings_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(starts_at, blocked_until, '[)') with &&
  ) where (status <> 'cancelled')
);
create index bookings_shop_starts_idx on public.bookings (shop_id, starts_at);
create index bookings_barber_starts_idx on public.bookings (barber_id, starts_at);
create index bookings_client_idx on public.bookings (client_id) where client_id is not null;
create index bookings_service_idx on public.bookings (service_id);

-- ---------------------------------------------------------------- messaging queue
create table public.scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind text not null check (kind in ('reminder_2h')),
  send_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (booking_id, kind)
);
create index scheduled_messages_due_idx on public.scheduled_messages (send_at) where sent_at is null;
create index scheduled_messages_shop_idx on public.scheduled_messages (shop_id);

-- Side effects requested by the booking engine, written in the same transaction.
-- Dispatchers (Twilio, Telegram, Resend, Stripe) consume it in later phases.
create table public.outbox (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  type text not null check (type in (
    'barber_alert', 'sms_confirmation', 'sms_cancelled', 'sms_rescheduled', 'refund_requested'
  )),
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index outbox_pending_idx on public.outbox (created_at) where status = 'pending';
create index outbox_shop_idx on public.outbox (shop_id);
create index outbox_booking_idx on public.outbox (booking_id);

create table public.support_access_log (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  admin_user_id uuid not null references auth.users (id),
  reason text not null,
  created_at timestamptz not null default now()
);
create index support_access_log_shop_idx on public.support_access_log (shop_id);
create index support_access_log_admin_idx on public.support_access_log (admin_user_id);

-- ---------------------------------------------------------------- triggers
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- A day off or closed day cannot be saved over live Bookings (SQLSTATE BB001).
create or replace function public.guard_day_off() returns trigger
language plpgsql set search_path = '' as $$
declare
  tz text;
  conflicts integer;
begin
  select s.timezone into tz from public.shops s where s.id = new.shop_id;

  select count(*) into conflicts
  from public.bookings b
  where b.shop_id = new.shop_id
    and b.status = 'confirmed'
    and b.barber_id = new.barber_id
    and (b.starts_at at time zone tz)::date = new.day;

  if conflicts > 0 then
    raise exception 'day has % live bookings', conflicts
      using errcode = 'BB001', detail = conflicts::text;
  end if;
  return new;
end $$;

create trigger barber_time_off_guard before insert or update on public.barber_time_off
  for each row execute function public.guard_day_off();

-- Shop-wide variant: any Barber's live Booking on that day blocks the closed day.
create or replace function public.guard_closed_day() returns trigger
language plpgsql set search_path = '' as $$
declare
  tz text;
  conflicts integer;
begin
  select s.timezone into tz from public.shops s where s.id = new.shop_id;

  select count(*) into conflicts
  from public.bookings b
  where b.shop_id = new.shop_id
    and b.status = 'confirmed'
    and (b.starts_at at time zone tz)::date = new.day;

  if conflicts > 0 then
    raise exception 'day has % live bookings', conflicts
      using errcode = 'BB001', detail = conflicts::text;
  end if;
  return new;
end $$;

create trigger shop_closed_days_guard before insert or update on public.shop_closed_days
  for each row execute function public.guard_closed_day();
