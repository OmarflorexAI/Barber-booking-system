-- Security audit 2026-11-18, findings #3-#5: close the gaps where a signed-in user could go
-- around the app and change, through Supabase's API, fields only the server or our team set.
-- The server connects as the DB owner, so none of this applies to the app itself.

-- #3: an Owner edits their Shop's own details, never the booking link (Q21: only our team),
-- the number texts are sent from, or our bookkeeping fields.
create or replace function public.guard_shop_billing_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' then
    if new.plan is distinct from old.plan
       or new.billing_status is distinct from old.billing_status
       or new.status is distinct from old.status
       or new.sms_enabled is distinct from old.sms_enabled
       or new.sms_registration is distinct from old.sms_registration
       or new.payments_enabled is distinct from old.payments_enabled
       or new.payment_account_id is distinct from old.payment_account_id
       or new.id is distinct from old.id
       or new.slug is distinct from old.slug
       or new.sms_from_number is distinct from old.sms_from_number
       or new.cancelled_at is distinct from old.cancelled_at
       or new.daily_email_last_date is distinct from old.daily_email_last_date
       or new.created_at is distinct from old.created_at then
      raise exception 'only our team can change this field' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- #4: a Barber edits their own profile, but their phone is Owner-only (Q27).
create or replace function public.guard_barber_self_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not private.is_shop_owner(old.shop_id) then
    if new.shop_id is distinct from old.shop_id
       or new.user_id is distinct from old.user_id
       or new.active is distinct from old.active
       or new.sort_order is distinct from old.sort_order
       or new.email is distinct from old.email
       or new.phone_e164 is distinct from old.phone_e164 then
      raise exception 'only the owner can change this field' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- #5: once a Client replies STOP, only the server (their START reply) turns texts back on.
create or replace function public.guard_client_opt_out() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and old.sms_opt_out and not new.sms_opt_out then
    raise exception 'only the Client can turn texts back on' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger clients_opt_out_guard before update on public.clients
  for each row execute function public.guard_client_opt_out();
