import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EmailProvider } from "@/server/alerts";
import { createLeads } from "@/server/leads";
import { dropUser, makePlatformAdmin, NOW, sql, uniquePhone } from "./fixtures";

/**
 * Leads from the landing page. Real Postgres; fake email provider.
 */

const TAG = `Lead Test ${Date.now()}`;
const HOUR = 60 * 60_000;

function fakeEmail() {
  const sent: { to: string[]; subject: string; text: string }[] = [];
  let down = false;
  const email: EmailProvider = {
    async send(m) {
      if (down) throw new Error("email down");
      sent.push(m);
    },
  };
  return { email, sent, setDown: (v: boolean) => (down = v) };
}

let admin: string;
let adminEmail: string;
let f: ReturnType<typeof fakeEmail>;
const leads = (now = NOW) => createLeads({ sql, email: f.email, clock: () => now });
const input = (over: Partial<Parameters<ReturnType<typeof createLeads>["submit"]>[0]> = {}) => ({
  shopName: `${TAG} Shop`,
  ownerName: "Rafael Diaz",
  phone: uniquePhone(),
  neighborhood: "Washington Heights",
  barberCount: 4,
  message: "We take bookings on WhatsApp now.",
  locale: "es" as const,
  ...over,
});
const rowsFor = (phone: string) =>
  sql<{ shop_name: string; phone_e164: string; notified_at: Date | null; locale: string }[]>`
    select shop_name, phone_e164, notified_at, locale from public.leads
    where shop_name like ${`${TAG}%`} and phone_e164 = ${phone} order by created_at
  `;
// Our own leads only: the dev database is shared, so other leads may be waiting too.
const mine = () => f.sent.filter((m) => m.text.includes(TAG));

beforeEach(async () => {
  f = fakeEmail();
  admin = await makePlatformAdmin();
  adminEmail = (await sql<{ email: string }[]>`select email from auth.users where id = ${admin}`)[0].email;
});
afterEach(async () => {
  await dropUser(admin);
});
afterAll(async () => {
  await sql`delete from public.leads where shop_name like ${`${TAG}%`}`;
  await sql.end();
});

describe("a lead from the landing page", () => {
  it("is saved with a normalized phone and emailed to the Platform admins", async () => {
    const e164 = uniquePhone();
    const phone = `(${e164.slice(2, 5)}) ${e164.slice(5, 8)}-${e164.slice(8)}`;
    expect(await leads().submit(input({ phone }))).toEqual({ ok: true });

    const [row] = await rowsFor(e164);
    expect(row).toMatchObject({ shop_name: `${TAG} Shop`, phone_e164: e164, locale: "es" });
    expect(row.notified_at).not.toBeNull();

    const [m] = mine();
    expect(m.to).toContain(adminEmail);
    expect(m.subject).toContain(`${TAG} Shop`);
    expect(m.text).toContain("Rafael Diaz");
    expect(m.text).toContain("Washington Heights");
    expect(m.text).toContain("4");
  });

  it("refuses a phone number that can't be real", async () => {
    expect(await leads().submit(input({ phone: "555-01" }))).toEqual({ ok: false, code: "INVALID_PHONE" });
    expect(mine()).toHaveLength(0);
  });

  it("refuses a missing shop or owner name", async () => {
    expect(await leads().submit(input({ shopName: "  " }))).toEqual({ ok: false, code: "INVALID_INPUT" });
    expect(await leads().submit(input({ ownerName: "" }))).toEqual({ ok: false, code: "INVALID_INPUT" });
  });

  it("does not save the same phone twice within 24 hours, but does after", async () => {
    const phone = uniquePhone();
    const e164 = phone;
    expect(await leads().submit(input({ phone }))).toEqual({ ok: true });
    expect(await leads(new Date(NOW.getTime() + 23 * HOUR)).submit(input({ phone }))).toEqual({ ok: true });
    expect(await rowsFor(e164)).toHaveLength(1);
    expect(mine()).toHaveLength(1);

    expect(await leads(new Date(NOW.getTime() + 25 * HOUR)).submit(input({ phone }))).toEqual({ ok: true });
    expect(await rowsFor(e164)).toHaveLength(2);
  });

  it("keeps the lead when the email fails, and sends it on a later run", async () => {
    const phone = uniquePhone();
    f.setDown(true);
    expect(await leads().submit(input({ phone }))).toEqual({ ok: true });
    const [waiting] = await rowsFor(phone);
    expect(waiting.notified_at).toBeNull();

    f.setDown(false);
    const r = await leads().notifyPending();
    expect(r.sent).toBeGreaterThanOrEqual(1);
    const [done] = await rowsFor(phone);
    expect(done.notified_at).not.toBeNull();
    expect(mine()).toHaveLength(1);

    // Already sent: a second run doesn't send it again.
    await leads().notifyPending();
    expect(mine()).toHaveLength(1);
  });
});
