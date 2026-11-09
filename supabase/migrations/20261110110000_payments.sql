-- B2: online payments (provider-neutral; Stripe in test mode for now).

-- The Shop's account at the payment provider, and whether it can take payments yet.
alter table public.shops rename column stripe_account_id to payment_account_id;
alter table public.shops add column payments_enabled boolean not null default false;

-- An online Booking waits for payment: it holds the time until hold_expires_at.
-- The no-double-booking rule already counts every status except 'cancelled'.
alter table public.bookings drop constraint bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending_payment', 'confirmed', 'cancelled', 'arrived', 'no_show'));
alter table public.bookings add column hold_expires_at timestamptz;
alter table public.bookings add constraint bookings_hold_check
  check (status <> 'pending_payment' or hold_expires_at is not null);
-- The provider's checkout and payment references (refunds use the payment one).
alter table public.bookings add column checkout_ref text unique;
alter table public.bookings add column payment_ref text;
create index bookings_hold_idx on public.bookings (hold_expires_at) where status = 'pending_payment';

-- 'system': released because the payment hold ran out.
alter table public.bookings drop constraint bookings_cancelled_by_check;
alter table public.bookings add constraint bookings_cancelled_by_check
  check (cancelled_by in ('client', 'barber', 'owner', 'admin', 'system'));

-- Every provider event handled, so a repeated event has no second effect.
create table public.payment_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.payment_events enable row level security;
revoke all on table public.payment_events from anon, authenticated;

-- The Owner is told when an automatic refund keeps failing.
alter table public.outbox drop constraint outbox_type_check;
alter table public.outbox add constraint outbox_type_check
  check (type in (
    'barber_alert', 'sms_confirmation', 'sms_reminder', 'sms_cancelled', 'sms_rescheduled',
    'refund_requested', 'refund_failed'
  ));
