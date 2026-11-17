import { describe, expect, it } from "vitest";
import { renderClientEmail, type EmailFacts } from "@/server/client-email/templates";

const base: EmailFacts = {
  locale: "en",
  kind: "confirmation",
  shopName: "Fresh Cuts",
  shopPhone: "+17185550123",
  serviceName: "Fade",
  barberName: "Carlos",
  // Tuesday 2027-01-12, 10:00 in New York.
  startsAt: new Date("2027-01-12T15:00:00Z"),
  timezone: "America/New_York",
  manageUrl: "https://example.test/m/tok123",
  rebookUrl: "https://example.test/b/fresh-cuts",
};

describe("client email templates", () => {
  it("English confirmation: Shop, Service, Barber, New York time and manage link", () => {
    const e = renderClientEmail(base);
    expect(e.subject).toBe("Booked: Fade at Fresh Cuts, Tuesday, January 12 at 10:00 AM");
    for (const s of ["Fresh Cuts", "Fade", "Carlos", "Tuesday, January 12 at 10:00 AM", "https://example.test/m/tok123", "(718) 555-0123"]) {
      expect(e.text).toContain(s);
    }
    expect(e.html).toContain('href="https://example.test/m/tok123"');
    expect(e.html).toContain('lang="en"');
  });

  it("Spanish confirmation", () => {
    const e = renderClientEmail({ ...base, locale: "es" });
    expect(e.subject).toMatch(/^Cita confirmada: Fade en Fresh Cuts, martes, 12 de enero/);
    expect(e.text).toContain("Tu cita está confirmada.");
    expect(e.text).toContain("Cambiar o cancelar tu cita: https://example.test/m/tok123");
    expect(e.html).toContain('lang="es"');
  });

  it("rescheduled shows the new and the old time, and who moved it", () => {
    const facts = { ...base, kind: "rescheduled" as const, by: "owner" as const, previousStartsAt: new Date("2027-01-12T14:00:00Z") };
    const en = renderClientEmail(facts);
    expect(en.text).toContain("Fresh Cuts moved your booking.");
    expect(en.text).toContain("Was: Tuesday, January 12 at 9:00 AM");
    const es = renderClientEmail({ ...facts, locale: "es", by: "client" });
    expect(es.text).toContain("Cambiaste tu cita.");
    expect(es.text).toMatch(/Antes: martes, 12 de enero, 9:00/);
  });

  it("cancelled links to the booking page, not the manage link", () => {
    const en = renderClientEmail({ ...base, kind: "cancelled", by: "barber" });
    expect(en.subject).toMatch(/^Cancelled:/);
    expect(en.text).toContain("Fresh Cuts cancelled this booking.");
    expect(en.text).toContain("Book again: https://example.test/b/fresh-cuts");
    expect(en.text).not.toContain("/m/tok123");
    const es = renderClientEmail({ ...base, kind: "cancelled", by: "client", locale: "es" });
    expect(es.text).toContain("Cancelaste esta cita.");
    expect(es.text).toContain("Reservar de nuevo: https://example.test/b/fresh-cuts");
  });

  it("escapes names in the HTML", () => {
    const e = renderClientEmail({ ...base, shopName: "Cuts <&> Co", shopPhone: null });
    expect(e.html).toContain("Cuts &lt;&amp;&gt; Co");
    expect(e.html).not.toContain("Cuts <&> Co");
    expect(e.text).not.toContain("Questions?");
  });
});
