import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import type { DashboardWeek } from "@/server/reporting";
import { Avatar } from "./drilldown-sheet";
import { busiestDay, busiestHour, hourLabel, intl, noon, topBarbers } from "./week-facts";

/**
 * Three facts about the week, read off the real counts: the busiest day, the busiest start
 * hour and the top Barber (a crown, in ink; ties say so). A fact with nothing behind it isn't
 * shown, and the strip disappears on an empty week. Server component; the tiles enter with
 * the page's stagger and the crown gives one small wobble (motion-safe only).
 */
export function Highlights({ week, locale, startIndex }: { week: DashboardWeek; locale: Locale; startIndex: number }) {
  const d = dictionaries[locale].dashboard;
  const day = busiestDay(week);
  const hour = busiestHour(week);
  const top = topBarbers(week);
  const weekday = new Intl.DateTimeFormat(intl(locale), { timeZone: "UTC", weekday: "long" });

  const tiles: { key: string; label: string; value: string; sub: string; icon: React.ReactNode }[] = [];
  if (day) tiles.push({ key: "day", label: d.busiestDay, value: cap(weekday.format(noon(day.date))), sub: d.bookingsCount(day.bookings), icon: <CalendarIcon /> });
  if (hour) tiles.push({ key: "hour", label: d.busiestHour, value: hourLabel(hour.hour, locale), sub: d.visitsCount(hour.visits), icon: <ClockIcon /> });
  if (top)
    tiles.push({
      key: "barber",
      label: d.topBarber,
      value: top.barbers.length === 1 ? top.barbers[0]!.name : top.barbers.length === 2 ? top.barbers.map((b) => first(b.name)).join(" & ") : d.tied(top.barbers.length),
      sub: d.bookingsCount(top.bookings),
      icon: top.barbers.length === 1 ? <Avatar barber={top.barbers[0]!} /> : <CrownIcon />,
    });
  if (tiles.length === 0) return null;

  return (
    <section aria-labelledby="highlights">
      <h2 id="highlights" className="sr-only">
        {d.highlights}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {tiles.map((t, i) => (
          <li
            key={t.key}
            data-testid={`highlight-${t.key}`}
            className="card-depth enter flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface p-4"
            style={{ "--i": startIndex + i } as React.CSSProperties}
          >
            <span className="relative shrink-0">
              {t.key === "barber" && top?.barbers.length === 1 ? (
                <>
                  {t.icon}
                  <span aria-hidden="true" className="crown absolute -top-2.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-paper ring-2 ring-surface">
                    <CrownIcon small />
                  </span>
                </>
              ) : (
                <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-raised text-ink">
                  {t.icon}
                </span>
              )}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm text-muted">{t.label}</span>
              <span className="truncate font-semibold">{t.value}</span>
              <span className="font-mono text-xs leading-snug text-muted tabular-nums">{t.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const first = (name: string) => name.split(/\s+/)[0] ?? name;

const icon = { "aria-hidden": true, focusable: false, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function CalendarIcon() {
  return (
    <svg {...icon} className="h-5 w-5">
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <circle cx="12" cy="15" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg {...icon} className="h-5 w-5">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function CrownIcon({ small = false }: { small?: boolean }) {
  return (
    <svg {...icon} strokeWidth={small ? 2 : 1.5} className={small ? "h-3 w-3" : "h-5 w-5"}>
      <path d="M4 17h16M5 17l-1.5-9 5 4L12 6l3.5 6 5-4L19 17" />
    </svg>
  );
}
