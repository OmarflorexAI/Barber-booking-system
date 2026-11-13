/** What the server page hands the day board: everything already formatted in New York time. */
export type DayRow = {
  id: string;
  barberId: string;
  serviceId: string;
  kind: "booking" | "walk_in";
  status: "pending_payment" | "confirmed" | "arrived" | "no_show";
  startMs: number;
  endMs: number;
  /** "10:30" and "AM" / "a. m.": the row's mono start time and its small period. */
  startHm: string;
  startPeriod: string;
  /** "11:00": the end time under the start. */
  endHm: string;
  /** "10:30 AM – 11:00 AM": the sheet's line. */
  range: string;
  durationMin: number;
  price: string;
  paid: boolean;
  client: string | null;
  phone: string | null;
  phoneLabel: string | null;
  service: string;
  /** Booked online by the Client in the last 2 hours. */
  isNew: boolean;
};

export type DayBarber = { id: string; name: string; services: { id: string; name: string }[] };
