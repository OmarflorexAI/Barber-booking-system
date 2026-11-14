-- M3: an optional phone per Barber, seen only by the Owner (Q27). Barbers no longer
-- sign in, and RLS already limits barbers rows to Shop members; the public booking
-- page reads barbers through the server, which never selects this column.
alter table public.barbers
  add column phone_e164 text
  check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$');
