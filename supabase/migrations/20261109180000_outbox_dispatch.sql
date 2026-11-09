-- B1: the sending worker drains the outbox.
-- next_attempt_at doubles as the claim lease: claiming pushes it forward, so a
-- worker that dies mid-send releases the row when the lease runs out.
-- 'skipped' = intentionally not sent (texts off, Client opted out, Booking cancelled).
-- 'sms_reminder' rows are created from due scheduled_messages, so reminders get the same retries.

alter table public.outbox
  add column next_attempt_at timestamptz not null default now();

alter table public.outbox drop constraint outbox_status_check;
alter table public.outbox add constraint outbox_status_check
  check (status in ('pending', 'done', 'failed', 'skipped'));

alter table public.outbox drop constraint outbox_type_check;
alter table public.outbox add constraint outbox_type_check
  check (type in (
    'barber_alert', 'sms_confirmation', 'sms_reminder', 'sms_cancelled', 'sms_rescheduled', 'refund_requested'
  ));

drop index if exists public.outbox_pending_idx;
create index outbox_due_idx on public.outbox (next_attempt_at) where status = 'pending';
