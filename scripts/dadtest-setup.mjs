// Create (or top up) the "dad-test" Shop: a Spanish-friendly copy of demo-shop.
//   npm run dadtest:setup
// Idempotent: re-running adds only what is missing. demo-shop is only read.
// Barbers are copied without logins or phone numbers, so no alerts go to the demo team.
import postgres from "postgres";

const SLUG = "dad-test";
const NAME = "Barbería de Prueba";
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

try {
  const [src] = await sql`select * from public.shops where slug = 'demo-shop'`;
  if (!src) throw new Error('Source shop "demo-shop" not found');

  await sql.begin(async (tx) => {
    let [shop] = await tx`select id from public.shops where slug = ${SLUG}`;
    let created = false;
    if (!shop) {
      [shop] = await tx`
        insert into public.shops (slug, name, phone, address, timezone, cancel_cutoff_minutes,
                                  manual_booking_minutes, plan, billing_status, about_en, about_es,
                                  payments_enabled, sms_enabled)
        values (${SLUG}, ${NAME}, ${src.phone}, ${src.address}, 'America/New_York', ${src.cancel_cutoff_minutes},
                ${src.manual_booking_minutes}, ${src.plan}, ${src.billing_status}, ${src.about_en}, ${src.about_es},
                false, false)
        returning id`;
      created = true;
    }

    const newBarbers = await tx`
      insert into public.barbers (shop_id, display_name, bio, bio_es, specialties, active, sort_order, photo_url, instagram)
      select ${shop.id}, b.display_name, b.bio, b.bio_es, b.specialties, b.active, b.sort_order, b.photo_url, b.instagram
      from public.barbers b
      where b.shop_id = ${src.id}
        and not exists (select 1 from public.barbers x where x.shop_id = ${shop.id} and x.display_name = b.display_name)
      returning id`;

    const newServices = await tx`
      insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min, active, sort_order)
      select ${shop.id}, s.name_en, s.name_es, s.duration_min, s.buffer_min, s.active, s.sort_order
      from public.services s
      where s.shop_id = ${src.id}
        and not exists (select 1 from public.services x where x.shop_id = ${shop.id} and x.name_en = s.name_en)
      returning id`;

    const newPrices = await tx`
      insert into public.barber_services (shop_id, barber_id, service_id, price_cents, duration_override_min,
                                          special_price_cents, special_ends_at)
      select ${shop.id}, nb.id, ns.id, bs.price_cents, bs.duration_override_min,
             bs.special_price_cents, bs.special_ends_at
      from public.barber_services bs
      join public.barbers sb on sb.id = bs.barber_id
      join public.services ss on ss.id = bs.service_id
      join public.barbers nb on nb.shop_id = ${shop.id} and nb.display_name = sb.display_name
      join public.services ns on ns.shop_id = ${shop.id} and ns.name_en = ss.name_en
      where bs.shop_id = ${src.id}
        and not exists (select 1 from public.barber_services x where x.barber_id = nb.id and x.service_id = ns.id)
      returning barber_id`;

    const newHours = await tx`
      insert into public.weekly_hours (shop_id, barber_id, weekday, start_time, end_time, break_start, break_end)
      select ${shop.id}, nb.id, wh.weekday, wh.start_time, wh.end_time, wh.break_start, wh.break_end
      from public.weekly_hours wh
      join public.barbers sb on sb.id = wh.barber_id
      join public.barbers nb on nb.shop_id = ${shop.id} and nb.display_name = sb.display_name
      where wh.shop_id = ${src.id}
        and not exists (select 1 from public.weekly_hours x where x.barber_id = nb.id and x.weekday = wh.weekday)
      returning id`;

    console.log(created ? `Created shop ${SLUG} ("${NAME}").` : `Shop ${SLUG} already exists.`);
    console.log(`Added: ${newBarbers.length} barbers, ${newServices.length} services, ${newPrices.length} prices, ${newHours.length} weekly-hour rows.`);
    if (!created && !newBarbers.length && !newServices.length && !newPrices.length && !newHours.length) console.log("Nothing to do.");
  });
  console.log(`Booking page: /b/${SLUG}`);
} catch (e) {
  console.error("Failed:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
