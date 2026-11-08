import { connection, type NextRequest } from "next/server";
import { z } from "zod";
import { isBookingError } from "@/server/booking-engine";
import { bookingEngine } from "@/server/engine";

const Query = z.object({
  shopId: z.uuid(),
  serviceId: z.uuid(),
  barberId: z.union([z.literal("any"), z.uuid()]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Free start times for one day. Public: it only reveals which times are open. */
export async function GET(request: NextRequest) {
  await connection();
  const parsed = Query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return Response.json({ code: "INVALID_INPUT" }, { status: 400 });

  try {
    const result = await bookingEngine().getAvailability({ ...parsed.data, now: new Date() });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (isBookingError(e)) return Response.json({ code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    console.error("availability failed", e);
    return Response.json({ code: "UNKNOWN" }, { status: 500 });
  }
}
