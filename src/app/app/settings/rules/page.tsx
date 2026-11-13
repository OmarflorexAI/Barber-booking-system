import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { RowsSkeleton } from "../../_shell/skeleton";
import { BackToSettings } from "../_back";
import { ownerContext } from "../_owner";
import { CutoffForm } from "./cutoff-form";

export const metadata: Metadata = { title: "Booking rules" };

/** The cutoff choices offered, in minutes (a Shop's own other value is added to the list). */
const CHOICES = [0, 30, 60, 120, 180, 360, 720, 1440];

/** Booking rules (Owner only): how close to a Booking a Client can still cancel or change it online. */
export default function RulesPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<RowsSkeleton rows={8} />}>
        <Rules />
      </Suspense>
    </div>
  );
}

async function Rules() {
  const ctx = await ownerContext();
  if (!ctx) return null;
  const { membership, t } = ctx;
  const s = t.settings.rules;

  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("cancel_cutoff_minutes")
    .eq("id", membership.shopId)
    .single<{ cancel_cutoff_minutes: number }>();
  if (!shop) throw new Error("Shop not found");
  const current = shop.cancel_cutoff_minutes;

  const label = (m: number) => (m === 0 ? s.untilStart : m < 60 || m % 60 !== 0 ? s.minBefore(m) : s.hoursBefore(m / 60));
  const values = [...new Set([...CHOICES, current])].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <BackToSettings label={t.settings.back} />
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">{s.title}</h1>
        <p className="max-w-prose leading-relaxed text-muted">{s.intro}</p>
      </div>
      <CutoffForm
        shopId={membership.shopId}
        initial={current}
        choices={values.map((m) => ({ minutes: m, label: label(m), current: s.current(label(m)) }))}
        labels={{
          cutoffLabel: s.cutoffLabel,
          save: s.save,
          saving: s.saving,
          saved: s.saved,
          reminderTitle: s.reminderTitle,
          reminderBody: s.reminderBody,
          errors: s.errors,
        }}
      />
    </div>
  );
}
