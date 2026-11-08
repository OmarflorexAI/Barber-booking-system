-- Row-level security: each Shop's data is visible only to its own members.
-- The public booking page and the booking engine run on the server with the
-- database owner role, so anon gets nothing here.

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

create or replace function private.is_shop_member(p_shop_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.shop_members
    where shop_id = p_shop_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.is_shop_owner(p_shop_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.shop_members
    where shop_id = p_shop_id and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

-- Barber rows that belong to the signed-in user (one per Shop at most).
create or replace function private.my_barber_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select b.id from public.barbers b
  join public.shop_members m on m.shop_id = b.shop_id and m.user_id = b.user_id
  where b.user_id = (select auth.uid());
$$;

revoke all on function private.is_platform_admin() from public, anon;
revoke all on function private.is_shop_member(uuid) from public, anon;
revoke all on function private.is_shop_owner(uuid) from public, anon;
revoke all on function private.my_barber_ids() from public, anon;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_shop_member(uuid) to authenticated;
grant execute on function private.is_shop_owner(uuid) to authenticated;
grant execute on function private.my_barber_ids() to authenticated;

-- Enable RLS everywhere and take everything away from anon.
do $$
declare t text;
begin
  foreach t in array array[
    'shops', 'platform_admins', 'shop_members', 'barbers', 'barber_gallery',
    'services', 'barber_services', 'weekly_hours', 'barber_time_off',
    'shop_closed_days', 'clients', 'bookings', 'scheduled_messages', 'outbox',
    'support_access_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
  end loop;
end $$;

-- Server-only tables: no policies for authenticated users at all.
revoke all on table public.scheduled_messages from authenticated;
revoke all on table public.outbox from authenticated;
revoke all on table public.support_access_log from authenticated;

-- ---------------------------------------------------------------- shops
create policy shops_select on public.shops for select to authenticated
  using ((select private.is_shop_member(id)));
create policy shops_update on public.shops for update to authenticated
  using ((select private.is_shop_owner(id))) with check ((select private.is_shop_owner(id)));

create policy platform_admins_self on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- members
create policy shop_members_select on public.shop_members for select to authenticated
  using ((select private.is_shop_member(shop_id)));
create policy shop_members_owner_write on public.shop_members for all to authenticated
  using ((select private.is_shop_owner(shop_id))) with check ((select private.is_shop_owner(shop_id)));

-- ---------------------------------------------------------------- barbers
create policy barbers_select on public.barbers for select to authenticated
  using ((select private.is_shop_member(shop_id)));
create policy barbers_owner_write on public.barbers for all to authenticated
  using ((select private.is_shop_owner(shop_id))) with check ((select private.is_shop_owner(shop_id)));
create policy barbers_self_update on public.barbers for update to authenticated
  using (id in (select private.my_barber_ids())) with check (id in (select private.my_barber_ids()));

-- A Barber editing their own profile may not change who they are or whether they are bookable.
create or replace function public.guard_barber_self_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not private.is_shop_owner(old.shop_id) then
    if new.shop_id is distinct from old.shop_id
       or new.user_id is distinct from old.user_id
       or new.active is distinct from old.active
       or new.sort_order is distinct from old.sort_order then
      raise exception 'only the owner can change this field' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger barbers_self_update_guard before update on public.barbers
  for each row execute function public.guard_barber_self_update();

create policy barber_gallery_select on public.barber_gallery for select to authenticated
  using ((select private.is_shop_member(shop_id)));
create policy barber_gallery_write on public.barber_gallery for all to authenticated
  using ((select private.is_shop_owner(shop_id)) or barber_id in (select private.my_barber_ids()))
  with check ((select private.is_shop_owner(shop_id)) or barber_id in (select private.my_barber_ids()));

-- ---------------------------------------------------------------- services and prices (owner only)
create policy services_select on public.services for select to authenticated
  using ((select private.is_shop_member(shop_id)));
create policy services_owner_write on public.services for all to authenticated
  using ((select private.is_shop_owner(shop_id))) with check ((select private.is_shop_owner(shop_id)));

create policy barber_services_select on public.barber_services for select to authenticated
  using ((select private.is_shop_member(shop_id)));
create policy barber_services_owner_write on public.barber_services for all to authenticated
  using ((select private.is_shop_owner(shop_id))) with check ((select private.is_shop_owner(shop_id)));

-- ---------------------------------------------------------------- schedule
create policy weekly_hours_select on public.weekly_hours for select to authenticated
  using ((select private.is_shop_member(shop_id)));
create policy weekly_hours_write on public.weekly_hours for all to authenticated
  using ((select private.is_shop_owner(shop_id)) or barber_id in (select private.my_barber_ids()))
  with check ((select private.is_shop_owner(shop_id)) or barber_id in (select private.my_barber_ids()));

create policy barber_time_off_select on public.barber_time_off for select to authenticated
  using ((select private.is_shop_member(shop_id)));
create policy barber_time_off_write on public.barber_time_off for all to authenticated
  using ((select private.is_shop_owner(shop_id)) or barber_id in (select private.my_barber_ids()))
  with check ((select private.is_shop_owner(shop_id)) or barber_id in (select private.my_barber_ids()));

create policy shop_closed_days_select on public.shop_closed_days for select to authenticated
  using ((select private.is_shop_member(shop_id)));
create policy shop_closed_days_owner_write on public.shop_closed_days for all to authenticated
  using ((select private.is_shop_owner(shop_id))) with check ((select private.is_shop_owner(shop_id)));

-- ---------------------------------------------------------------- clients
-- Owners see every Client; a Barber sees only Clients who booked with them.
create policy clients_select on public.clients for select to authenticated
  using (
    (select private.is_shop_owner(shop_id))
    or exists (
      select 1 from public.bookings b
      where b.client_id = clients.id and b.barber_id in (select private.my_barber_ids())
    )
  );
create policy clients_owner_write on public.clients for all to authenticated
  using ((select private.is_shop_owner(shop_id))) with check ((select private.is_shop_owner(shop_id)));

-- ---------------------------------------------------------------- bookings (read only; writes go through the engine)
create policy bookings_select on public.bookings for select to authenticated
  using ((select private.is_shop_owner(shop_id)) or barber_id in (select private.my_barber_ids()));
revoke insert, update, delete on table public.bookings from authenticated;
