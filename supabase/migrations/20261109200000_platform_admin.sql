-- B6: what Platform admins track per Shop.
-- sms_registration: the Shop's US texting registration (A2P 10DLC). Only 'approved' turns texts on.
-- billing_status: version 1 bills by hand (first month free, then Zelle/cash/invoice).
-- cancelled_at: when the Shop cancelled; everything is deleted 30 days later.
alter table public.shops
  add column sms_registration text not null default 'not_started'
    check (sms_registration in ('not_started', 'submitted', 'approved', 'rejected')),
  add column billing_status text not null default 'free_month'
    check (billing_status in ('free_month', 'paid', 'overdue')),
  add column cancelled_at timestamptz,
  add constraint shops_cancelled_at_check check ((status = 'cancelled') = (cancelled_at is not null));

create index shops_cancelled_at_idx on public.shops (cancelled_at) where cancelled_at is not null;
