import { connection, type NextRequest } from "next/server";
import { z } from "zod";
import { isBookingError } from "@/server/booking-engine";
import { bookingEngine } from "@/server/engine";

const Query = z.object({
  shopId: z.uuid(),
  serviceId: z.uuid(),
  barberId: z.union([z.literal("any"), z.uuid()]),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.coerce.number().int().min(1).max(31),
});

/** Which days from `from` on have a free time (the calendar's dots). Public, like /api/availability. */
export async function GET(request: NextRequest) {
  await connection();
  const parsed = Query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return Response.json({ code: "INVALID_INPUT" }, { status: 400 });
  const { from, days, ...rest } = parsed.data;
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date(`${from}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  try {
    const open = await bookingEngine().getOpenDays({ ...rest, dates, now: new Date() });
    return Response.json({ open }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (isBookingError(e)) return Response.json({ code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    console.error("open days failed", e);
    return Response.json({ code: "UNKNOWN" }, { status: 500 });
  }
}
