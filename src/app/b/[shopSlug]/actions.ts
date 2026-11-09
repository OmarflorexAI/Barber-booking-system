"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { isBookingError } from "@/server/booking-engine";
import { bookingEngine } from "@/server/engine";
import { payments } from "@/server/senders";
import { verifyTurnstile } from "@/server/turnstile";

const Input = z.object({
  shopId: z.uuid(),
  serviceId: z.uuid(),
  barberId: z.union([z.literal("any"), z.uuid()]),
  startsAt: z.iso.datetime(),
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(25),
  paymentMethod: z.enum(["in_person", "online"]),
  locale: z.enum(["en", "es"]).default("en"),
  turnstileToken: z.string().optional(),
});

export type CreateBookingResult =
  | { ok: true; manageToken: string; barberId: string; startsAt: string; priceCents: number; checkoutUrl?: string }
  | { ok: false; code: string };

/** The public booking form. Holds no rules itself: it checks the bot test and asks the engine. */
export async function createBookingAction(raw: z.input<typeof Input>): Promise<CreateBookingResult> {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const input = parsed.data;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!(await verifyTurnstile(input.turnstileToken, ip))) return { ok: false, code: "BOT_CHECK" };

  try {
    const { booking, manageToken } = await bookingEngine().createBooking({
      shopId: input.shopId,
      serviceId: input.serviceId,
      barberId: input.barberId,
      startsAt: new Date(input.startsAt),
      client: { name: input.name, phone: input.phone },
      paymentMethod: input.paymentMethod,
      locale: input.locale,
      now: new Date(),
    });
    // An online Booking is only held: send the Client to pay. If that fails, the manage
    // link still has a "Pay now" button for the rest of the hold.
    let checkoutUrl: string | undefined;
    if (input.paymentMethod === "online") {
      try {
        checkoutUrl = (await payments()?.startCheckout({ bookingId: booking.id, manageToken }))?.url;
      } catch (e) {
        console.error("startCheckout failed", e);
      }
    }
    return {
      ok: true,
      checkoutUrl,
      manageToken,
      barberId: booking.barberId,
      startsAt: booking.startsAt.toISOString(),
      priceCents: booking.priceCents,
    };
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error("createBooking failed", e);
    return { ok: false, code: "UNKNOWN" };
  }
}
