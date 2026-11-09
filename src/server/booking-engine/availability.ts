import { localToUtc, MINUTE, type LocalDate } from "./time";

/** Booking rules from the PRD. */
export const RULES = {
  gridMin: 15,
  minNoticeMin: 30,
  maxDaysAhead: 30,
  reminderLeadMin: 120,
  /** An online Booking holds its time this long while the Client pays. */
  paymentHoldMin: 10,
  /**
   * Missed visits: this many no-shows within the window and that phone pays online to
   * book (only where the Shop takes online payments). It clears itself as they age out.
   */
  noShowLimit: 2,
  noShowWindowDays: 90,
} as const;

/** A Barber's working hours for one weekday, in minutes since local midnight. */
export type DayHours = {
  start: number;
  end: number;
  breakStart: number | null;
  breakEnd: number | null;
};

export type Interval = { start: Date; end: Date };

export type SlotInput = {
  date: LocalDate;
  tz: string;
  /** null when the Barber does not work that weekday. */
  hours: DayHours | null;
  /** true for a Barber day off or a Shop closed day. */
  dayOff: boolean;
  durationMin: number;
  bufferMin: number;
  /** Live Bookings / Walk-ins as [starts_at, blocked_until). */
  busy: Interval[];
  now: Date;
};

/** Open stretches of the day: the working hours minus the break. */
export function openSegments(hours: DayHours): Array<[number, number]> {
  if (hours.breakStart === null || hours.breakEnd === null) return [[hours.start, hours.end]];
  return [
    [hours.start, hours.breakStart],
    [hours.breakEnd, hours.end],
  ].filter(([a, b]) => a < b) as Array<[number, number]>;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Earliest and latest start instants a Client may book right now. */
export function bookingWindow(now: Date): { earliest: Date; latest: Date } {
  return {
    earliest: new Date(now.getTime() + RULES.minNoticeMin * MINUTE),
    latest: new Date(now.getTime() + RULES.maxDaysAhead * 24 * 60 * MINUTE),
  };
}

/**
 * Every start time a Client may book for one Barber on one local day.
 * A slot is offered only when the whole block (service + cleaning buffer)
 * fits inside an open stretch and overlaps no live Booking.
 */
export function computeSlots(input: SlotInput): Date[] {
  const { date, tz, hours, dayOff, durationMin, bufferMin, busy, now } = input;
  if (!hours || dayOff) return [];

  const blockMs = (durationMin + bufferMin) * MINUTE;
  const { earliest, latest } = bookingWindow(now);
  const slots: Date[] = [];

  for (const [segStart, segEnd] of openSegments(hours)) {
    const firstGrid = Math.ceil(segStart / RULES.gridMin) * RULES.gridMin;
    const segEndUtc = localToUtc(date, segEnd, tz);

    for (let m = firstGrid; m < segEnd; m += RULES.gridMin) {
      const start = localToUtc(date, m, tz);
      if (!start) continue; // skipped hour on the spring-forward day
      const end = new Date(start.getTime() + blockMs);
      const limit = segEndUtc ?? new Date(start.getTime() + (segEnd - m) * MINUTE);

      if (end > limit) break; // later grid points only end later
      if (start < earliest || start > latest) continue;
      if (busy.some((b) => overlaps({ start, end }, b))) continue;
      slots.push(start);
    }
  }
  return slots;
}
