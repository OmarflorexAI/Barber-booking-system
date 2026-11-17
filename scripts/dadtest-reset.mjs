// Clear dad-test's test data: Bookings, Clients, outbox rows, scheduled messages, SMS log.
//   npm run dadtest:reset
// Keeps the Shop, Barbers, Services, hours and staff. Touches no other Shop.
import postgres from "postgres";

const SLUG = "dad-test";
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

try {
  const [shop] = await sql`select id from public.shops where slug = ${SLUG}`;
  if (!shop) throw new Error(`No shop "${SLUG}"; refusing to delete anything.`);

  const counts = await sql.begin(async (tx) => {
    const outbox = await tx`delete from public.outbox where shop_id = ${shop.id} returning 1`;
    const scheduled = await tx`delete from public.scheduled_messages where shop_id = ${shop.id} returning 1`;
    const sms = await tx`delete from public.sms_log where shop_id = ${shop.id} returning 1`;
    const bookings = await tx`delete from public.bookings where shop_id = ${shop.id} returning 1`;
    const clients = await tx`delete from public.clients where shop_id = ${shop.id} returning 1`;
    return { outbox: outbox.length, scheduled_messages: scheduled.length, sms_log: sms.length, bookings: bookings.length, clients: clients.length };
  });
  console.log(`Reset ${SLUG}:`, JSON.stringify(counts));
} catch (e) {
  console.error("Failed:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
