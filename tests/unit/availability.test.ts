import { describe, expect, it } from "vitest";
import { computeSlots, type SlotInput } from "@/server/booking-engine/availability";
import { localDayRange, localToUtc, toLocal } from "@/server/booking-engine/time";
import { normalizePhone } from "@/lib/phone";

const TZ = "America/New_York";
const hhmm = (h: number, m = 0) => h * 60 + m;
const times = (slots: Date[]) => slots.map((s) => toLocal(s, TZ).time);

function input(over: Partial<SlotInput> = {}): SlotInput {
  return {
    date: "2027-01-12", // a Tuesday in standard time
    tz: TZ,
    hours: { start: hhmm(9), end: hhmm(17), breakStart: hhmm(13), breakEnd: hhmm(14) },
    dayOff: false,
    durationMin: 30,
    bufferMin: 0,
    busy: [],
    now: new Date("2027-01-01T12:00:00Z"),
    ...over,
  };
}

describe("computeSlots", () => {
  it("offers 15-minute grid starts that fit before the break and before closing", () => {
    const t = times(computeSlots(input()));
    expect(t[0]).toBe("09:00");
    expect(t).toContain("09:15");
    expect(t).toContain("12:30"); // 12:30-13:00 fits
    expect(t).not.toContain("12:45"); // would run into the break
    expect(t).not.toContain("13:00");
    expect(t).toContain("14:00");
    expect(t.at(-1)).toBe("16:30"); // 16:30-17:00 is the last one
  });

  it("keeps the cleaning buffer inside open hours and around other bookings", () => {
    const tenAm = localToUtc("2027-01-12", hhmm(10), TZ)!;
    const busy = [{ start: tenAm, end: new Date(tenAm.getTime() + 45 * 60_000) }]; // 30 min + 15 buffer
    const t = times(computeSlots(input({ bufferMin: 15, busy })));
    expect(t).not.toContain("09:30"); // 09:30 + 45 min overlaps 10:00
    expect(t).toContain("09:15"); // 09:15-10:00 just fits
    expect(t).not.toContain("10:30"); // still blocked by the buffer
    expect(t).toContain("10:45");
    expect(t).not.toContain("12:30"); // 12:30 + 45 min crosses into the break
    expect(t).toContain("12:15");
  });

  it("honours the 30-minute minimum notice", () => {
    const now = localToUtc("2027-01-12", hhmm(10, 5), TZ)!;
    const t = times(computeSlots(input({ now })));
    expect(t[0]).toBe("10:45"); // 10:35 is the earliest instant; next grid point is 10:45
  });

  it("offers nothing more than 30 days ahead", () => {
    const now = new Date("2026-12-01T12:00:00Z");
    expect(computeSlots(input({ now }))).toHaveLength(0); // Jan 12 is 42 days away
  });

  it("offers nothing on a day off or a day without hours", () => {
    expect(computeSlots(input({ dayOff: true }))).toHaveLength(0);
    expect(computeSlots(input({ hours: null }))).toHaveLength(0);
  });
});

describe("daylight saving time (America/New_York)", () => {
  it("maps 10:00 local to the right UTC instant on both sides of the March change", () => {
    expect(localToUtc("2027-03-13", hhmm(10), TZ)!.toISOString()).toBe("2027-03-13T15:00:00.000Z"); // EST
    expect(localToUtc("2027-03-14", hhmm(10), TZ)!.toISOString()).toBe("2027-03-14T14:00:00.000Z"); // EDT
  });

  it("maps 10:00 local to the right UTC instant on both sides of the November change", () => {
    expect(localToUtc("2027-11-06", hhmm(10), TZ)!.toISOString()).toBe("2027-11-06T14:00:00.000Z"); // EDT
    expect(localToUtc("2027-11-07", hhmm(10), TZ)!.toISOString()).toBe("2027-11-07T15:00:00.000Z"); // EST
  });

  it("treats the skipped 02:30 on spring-forward day as non-existent", () => {
    expect(localToUtc("2027-03-14", hhmm(2, 30), TZ)).toBeNull();
  });

  it("has 23- and 25-hour days", () => {
    const spring = localDayRange("2027-03-14", TZ);
    const fall = localDayRange("2027-11-07", TZ);
    expect((spring.end.getTime() - spring.start.getTime()) / 3_600_000).toBe(23);
    expect((fall.end.getTime() - fall.start.getTime()) / 3_600_000).toBe(25);
  });

  it("keeps the local grid unchanged on both DST days", () => {
    for (const date of ["2027-03-14", "2027-11-07"]) {
      const t = times(computeSlots(input({ date, now: new Date(`${date.slice(0, 8)}01T12:00:00Z`) })));
      expect(t[0]).toBe("09:00");
      expect(t.at(-1)).toBe("16:30");
      expect(t).toHaveLength(26); // 14 before the break + 12 after
    }
  });
});

describe("normalizePhone", () => {
  it("accepts common US formats", () => {
    expect(normalizePhone("(718) 555-1234")).toBe("+17185551234");
    expect(normalizePhone("718.555.1234")).toBe("+17185551234");
    expect(normalizePhone("1 718 555 1234")).toBe("+17185551234");
    expect(normalizePhone("+1 718-555-1234")).toBe("+17185551234");
  });

  it("accepts international numbers with a plus", () => {
    expect(normalizePhone("+52 55 1234 5678")).toBe("+525512345678");
  });

  it("rejects junk", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("555-1234")).toBeNull();
    expect(normalizePhone("(018) 555-1234")).toBeNull();
  });
});
