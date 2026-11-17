-- Client emails (confirmation, cancelled, rescheduled). The Client may leave an email on
-- the booking form; it is optional (the phone stays required). The engine (owner
-- connection, RLS off) stores it trimmed and lowercased, and keeps the last one given
-- when a Client books again without one. The email's language is the Booking's
-- `locale`, which already exists, so no new column is needed for it.
alter table public.clients
  add column email text
  check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'));

-- The engine writes these in the same transaction as the Booking change; the sending
-- worker decides at send time whether there is still someone to email.
alter table public.outbox drop constraint outbox_type_check;
alter table public.outbox add constraint outbox_type_check
  check (type in (
    'barber_alert', 'sms_confirmation', 'sms_reminder', 'sms_cancelled', 'sms_rescheduled',
    'refund_requested', 'refund_failed',
    'email_confirmation', 'email_cancelled', 'email_rescheduled'
  ));
