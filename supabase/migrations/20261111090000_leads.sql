-- Shop Owners who asked about Barber Master on the landing page. Server-only:
-- written by the landing form's server action, read by the Platform admins' email.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  shop_name text not null check (length(shop_name) between 1 and 80),
  owner_name text not null check (length(owner_name) between 1 and 80),
  phone_e164 text not null,
  neighborhood text check (length(neighborhood) <= 80),
  barber_count smallint check (barber_count between 1 and 50),
  message text check (length(message) <= 1000),
  locale text not null default 'en' check (locale in ('en', 'es')),
  created_at timestamptz not null default now(),
  -- Set once the Platform admins have been emailed; null means "still to send".
  notified_at timestamptz
);
create index leads_phone_idx on public.leads (phone_e164, created_at);
create index leads_pending_idx on public.leads (created_at) where notified_at is null;
alter table public.leads enable row level security;
revoke all on table public.leads from anon, authenticated;
