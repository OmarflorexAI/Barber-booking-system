import { createClient } from "@/lib/supabase/server";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { toLocal } from "@/server/booking-engine/time";
import { DaysOff, HoursEditor, type WeekDay } from "./hours-editor";

type HoursRow = { weekday: number; start_time: string; end_time: string; break_start: string | null; break_end: string | null };

/** Postgres "HH:MM:SS" → "HH:MM". */
const hhmm = (t: string) => t.slice(0, 5);

/**
 * HOURS & DAYS OFF on the Barber profile (PLAN.md M4 job 4): the weekly hours with an optional
 * break, saved all at once, and the upcoming days off with add/remove. Days are the Shop's
 * (New York) calendar days. The engine checks the Owner on each action.
 */
export async function HoursSection({ shopId, barberId, locale }: { shopId: string; barberId: string; locale: Locale }) {
  const h = dictionaries[locale].settings.barberProfile.hours;
  const supabase = await createClient();
  const shop = await supabase.from("shops").select("timezone").eq("id", shopId).maybeSingle<{ timezone: string }>();
  const tz = shop.data?.timezone ?? "America/New_York";
  const today = toLocal(new Date(), tz).date;

  const [hours, off] = await Promise.all([
    supabase
      .from("weekly_hours")
      .select("weekday, start_time, end_time, break_start, break_end")
      .eq("shop_id", shopId)
      .eq("barber_id", barberId)
      .returns<HoursRow[]>(),
    supabase
      .from("barber_time_off")
      .select("day")
      .eq("shop_id", shopId)
      .eq("barber_id", barberId)
      .gte("day", today)
      .order("day")
      .returns<{ day: string }[]>(),
  ]);
  if (shop.error || hours.error || off.error) throw new Error("Couldn't load the Barber's hours");

  const week: WeekDay[] = (hours.data ?? []).map((r) => ({
    weekday: r.weekday,
    start: hhmm(r.start_time),
    end: hhmm(r.end_time),
    breakStart: r.break_start ? hhmm(r.break_start) : null,
    breakEnd: r.break_end ? hhmm(r.break_end) : null,
  }));

  return (
    <section aria-labelledby="barber-hours-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="barber-hours-title" className="text-xl font-semibold tracking-tight">
          {h.title}
        </h2>
        <p className="max-w-prose leading-relaxed text-muted">{h.intro}</p>
      </div>
      <HoursEditor shopId={shopId} barberId={barberId} locale={locale} week={week} />
      <DaysOff shopId={shopId} barberId={barberId} locale={locale} today={today} days={(off.data ?? []).map((d) => d.day)} />
    </section>
  );
}
