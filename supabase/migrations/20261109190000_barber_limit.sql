-- A Shop offers at most 6 active Barbers for Clients to choose from (SQLSTATE BB002).
-- The per-Shop advisory lock makes two concurrent adds wait for each other,
-- so they cannot both see 5 and both insert a 6th and 7th.
create or replace function public.guard_barber_limit() returns trigger
language plpgsql set search_path = '' as $$
declare
  active_count integer;
begin
  if not new.active or (tg_op = 'UPDATE' and old.active) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('barber_limit:' || new.shop_id::text, 0));
  select count(*) into active_count
  from public.barbers b
  where b.shop_id = new.shop_id and b.active and b.id <> new.id;

  if active_count >= 6 then
    raise exception 'a shop can have at most 6 active barbers'
      using errcode = 'BB002';
  end if;
  return new;
end $$;

revoke execute on function public.guard_barber_limit() from public, anon, authenticated;

create trigger barbers_limit_guard before insert or update of active on public.barbers
  for each row execute function public.guard_barber_limit();
