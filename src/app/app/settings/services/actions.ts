"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine";
import { shopAdmin } from "@/server/engine";

export type ServiceResult = { ok: true; serviceId?: string } | { ok: false; code: string };

const SaveInput = z.object({
  shopId: z.uuid(),
  serviceId: z.uuid().optional(),
  nameEn: z.string().trim().min(1).max(80),
  nameEs: z.string().trim().max(80),
  durationMin: z.number().int().min(15).max(240).refine((n) => n % 15 === 0),
  bufferMin: z.number().int().min(0).max(120),
});

async function userId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function run(label: string, fn: (userId: string) => Promise<ServiceResult>): Promise<ServiceResult> {
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

/** Add a Service, or edit one when serviceId is given. The engine checks the Owner and the 15-minute grid. */
export async function saveServiceAction(input: z.input<typeof SaveInput>): Promise<ServiceResult> {
  const parsed = SaveInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  return run("save service", async (uid) => {
    const { serviceId } = await shopAdmin().saveService({ userId: uid, ...parsed.data });
    return { ok: true, serviceId };
  });
}

/** Hide a Service from the booking page. Bookings already made keep it. */
export async function archiveServiceAction(shopId: string, serviceId: string): Promise<ServiceResult> {
  if (!z.object({ shopId: z.uuid(), serviceId: z.uuid() }).safeParse({ shopId, serviceId }).success) {
    return { ok: false, code: "INVALID_INPUT" };
  }
  return run("archive service", async (uid) => {
    await shopAdmin().archiveService({ userId: uid, shopId, serviceId });
    return { ok: true };
  });
}

/** Save the order Clients see. The list must be every active Service, once. */
export async function reorderServicesAction(shopId: string, serviceIds: string[]): Promise<ServiceResult> {
  if (!z.object({ shopId: z.uuid(), serviceIds: z.array(z.uuid()).min(1).max(100) }).safeParse({ shopId, serviceIds }).success) {
    return { ok: false, code: "INVALID_INPUT" };
  }
  return run("reorder services", async (uid) => {
    await shopAdmin().reorderServices({ userId: uid, shopId, serviceIds });
    return { ok: true };
  });
}
