"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine";
import { toLocal } from "@/server/booking-engine/time";
import { bookingEngine, shopAdmin } from "@/server/engine";

export type HoursResult = { ok: true } | { ok: false; code: string };

const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const WeekInput = z.object({
  shopId: z.uuid(),
  barberId: z.uuid(),
  days: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        start: Time,
        end: Time,
        breakStart: Time.nullable(),
        breakEnd: Time.nullable(),
      }),
    )
    .max(7),
});

const DayInput = z.object({ shopId: z.uuid(), barberId: z.uuid(), date: z.iso.date() });

async function userId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function run(label: string, fn: (userId: string) => Promise<HoursResult>): Promise<HoursResult> {
  const uid = await userId();
  if (!uid) return { ok: false, code: "FORBIDDEN" };
  try {
    return await fn(uid);
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error(`${label} failed`, e);
    return { ok: false, code: "UNKNOWN" };
  }
}

/** Replace the Barber's whole week. Days left out are off. Bookings already made are not moved. */
export async function saveHoursAction(input: z.input<typeof WeekInput>): Promise<HoursResult> {
  const parsed = WeekInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const { shopId, barberId, days } = parsed.data;
  return run("save weekly hours", async (uid) => {
    await shopAdmin().setWeeklyHours({ userId: uid, shopId, barberId, days });
    return { ok: true };
  });
}

/** Add a day off (a New York calendar day, today or later). Refused over live Bookings (DAY_HAS_BOOKINGS). */
export async function addDayOffAction(input: z.input<typeof DayInput>): Promise<HoursResult> {
  const parsed = DayInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const { shopId, barberId, date } = parsed.data;
  const supabase = await createClient();
  const { data: shop } = await supabase.from("shops").select("timezone").eq("id", shopId).maybeSingle<{ timezone: string }>();
  if (!shop) return { ok: false, code: "FORBIDDEN" };
  if (date < toLocal(new Date(), shop.timezone).date) return { ok: false, code: "DAY_PAST" };
  return run("add day off", async (uid) => {
    await bookingEngine().addBarberDayOff({ userId: uid, shopId, barberId, date });
    return { ok: true };
  });
}

export async function removeDayOffAction(input: z.input<typeof DayInput>): Promise<HoursResult> {
  const parsed = DayInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  return run("remove day off", async (uid) => {
    await shopAdmin().removeBarberDayOff({ userId: uid, ...parsed.data });
    return { ok: true };
  });
}
