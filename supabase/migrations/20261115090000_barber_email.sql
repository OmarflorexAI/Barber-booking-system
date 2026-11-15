-- An optional email per Barber for booking alerts, set by the Owner only. Barbers no
-- longer sign in (PLAN.md M6), so their login email is usually missing; alerts use this
-- first. Like phone_e164 it is never selected by the public booking page. The engine
-- (owner connection, RLS off) stores it trimmed and lowercased.
alter table public.barbers
  add column email text
  check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'));

-- A Barber with a legacy login may still update their own row through RLS: keep the
-- alert email (where their bookings go) Owner-only, like who they are and whether they are bookable.
create or replace function public.guard_barber_self_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not private.is_shop_owner(old.shop_id) then
    if new.shop_id is distinct from old.shop_id
       or new.user_id is distinct from old.user_id
       or new.active is distinct from old.active
       or new.sort_order is distinct from old.sort_order
       or new.email is distinct from old.email then
      raise exception 'only the owner can change this field' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
