-- Split "for all" write policies into insert/update/delete so each action has
-- one permissive policy (advisor 0006), and index composite foreign keys (0001).

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('shop_members',     'shop_members_owner_write',     'owner'),
      ('barbers',          'barbers_owner_write',          'owner'),
      ('barber_gallery',   'barber_gallery_write',         'owner_or_self'),
      ('services',         'services_owner_write',         'owner'),
      ('barber_services',  'barber_services_owner_write',  'owner'),
      ('weekly_hours',     'weekly_hours_write',           'owner_or_self'),
      ('barber_time_off',  'barber_time_off_write',        'owner_or_self'),
      ('shop_closed_days', 'shop_closed_days_owner_write', 'owner'),
      ('clients',          'clients_owner_write',          'owner')
    ) as t(tbl, pol, rule)
  loop
    execute format('drop policy %I on public.%I', r.pol, r.tbl);
    declare
      expr text := case r.rule
        when 'owner' then '(select private.is_shop_owner(shop_id))'
        else '((select private.is_shop_owner(shop_id)) or barber_id in (select private.my_barber_ids()))'
      end;
    begin
      execute format('create policy %I on public.%I for insert to authenticated with check (%s)',
        r.tbl || '_insert', r.tbl, expr);
      execute format('create policy %I on public.%I for delete to authenticated using (%s)',
        r.tbl || '_delete', r.tbl, expr);
      -- barbers has its own combined update policy below.
      if r.tbl <> 'barbers' then
        execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
          r.tbl || '_update', r.tbl, expr, expr);
      end if;
    end;
  end loop;
end $$;

-- One update policy for barbers: the owner, or the Barber editing their own row
-- (the guard trigger stops a Barber from changing owner-only fields).
drop policy barbers_self_update on public.barbers;
create policy barbers_update on public.barbers for update to authenticated
  using ((select private.is_shop_owner(shop_id)) or id in (select private.my_barber_ids()))
  with check ((select private.is_shop_owner(shop_id)) or id in (select private.my_barber_ids()));

create index barber_gallery_shop_barber_idx on public.barber_gallery (shop_id, barber_id);
create index barber_services_shop_barber_idx on public.barber_services (shop_id, barber_id);
create index barber_services_shop_service_idx on public.barber_services (shop_id, service_id);
create index barber_time_off_shop_barber_idx on public.barber_time_off (shop_id, barber_id);
create index barbers_user_idx on public.barbers (user_id);
create index bookings_shop_barber_idx on public.bookings (shop_id, barber_id);
create index bookings_shop_client_idx on public.bookings (shop_id, client_id);
create index bookings_shop_service_idx on public.bookings (shop_id, service_id);
create index weekly_hours_shop_barber_idx on public.weekly_hours (shop_id, barber_id);

-- Superseded by the composite indexes above.
drop index public.barber_services_shop_idx;
drop index public.weekly_hours_shop_idx;
drop index public.barber_time_off_shop_idx;
