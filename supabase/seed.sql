-- Demo Shop for development: http://localhost:3000/b/demo-shop
-- Safe to re-run: it deletes and recreates only the 'demo-shop' Shop.
-- Staff logins are added with: npm run staff:add -- <email> demo-shop <owner|barber> [barber name]

delete from public.shops where slug = 'demo-shop';

with shop as (
  insert into public.shops (slug, name, phone, address, cancel_cutoff_minutes, manual_booking_minutes)
  values ('demo-shop', 'Fresh Cuts Barbershop', '+17185550142', '1234 Grand Concourse, Bronx, NY', 60, 4)
  returning id
),
barbers as (
  insert into public.barbers (shop_id, display_name, bio, specialties, sort_order)
  select shop.id, b.name, b.bio, b.specialties, b.sort
  from shop, (values
    ('Carlos', 'Twelve years behind the chair. Clean fades and sharp lines.', array['Fades', 'Line-ups'], 0),
    ('Dre',    'Classic cuts and beard sculpting. Habla español.',             array['Beards', 'Classic cuts'], 1),
    ('Maya',   'Textured hair specialist. Designs on request.',                array['Designs', 'Curly hair'], 2)
  ) as b(name, bio, specialties, sort)
  returning id, shop_id, display_name
),
services as (
  insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min, sort_order)
  select shop.id, s.en, s.es, s.dur, s.buf, s.sort
  from shop, (values
    ('Haircut',           'Corte',              30, 0,  0),
    ('Skin fade',         'Desvanecido',        45, 15, 1),
    ('Beard trim',        'Arreglo de barba',   15, 0,  2),
    ('Haircut + beard',   'Corte + barba',      45, 15, 3),
    ('Kids cut (under 12)', 'Corte de niño (menor de 12)', 30, 0, 4)
  ) as s(en, es, dur, buf, sort)
  returning id, shop_id, name_en
),
prices as (
  insert into public.barber_services (shop_id, barber_id, service_id, price_cents, special_price_cents, special_ends_at)
  select b.shop_id, b.id, s.id,
    case s.name_en
      when 'Haircut' then 3000 when 'Skin fade' then 3500 when 'Beard trim' then 1500
      when 'Haircut + beard' then 4000 else 2000 end
      + case b.display_name when 'Carlos' then 500 else 0 end,
    case when s.name_en = 'Haircut + beard' then 3500 end,
    case when s.name_en = 'Haircut + beard' then now() + interval '14 days' end
  from barbers b cross join services s
  returning barber_id
)
insert into public.weekly_hours (shop_id, barber_id, weekday, start_time, end_time, break_start, break_end)
select b.shop_id, b.id, wd, '09:00', '19:00', '13:00', '14:00'
from barbers b cross join generate_series(1, 6) as wd; -- Monday to Saturday; closed Sunday
