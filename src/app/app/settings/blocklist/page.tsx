import type { Metadata } from "next";
import { Suspense } from "react";
import { formatPhone } from "@/lib/phone";
import { shopAdmin } from "@/server/engine";
import { RowsSkeleton } from "../../_shell/skeleton";
import { BackToSettings } from "../_back";
import { ownerContext } from "../_owner";
import { Blocklist } from "./blocklist";

export const metadata: Metadata = { title: "Blocklist" };

/** The engine's name for a number blocked before it ever booked: not worth showing. */
const PLACEHOLDER_NAME = "Blocked number";

/** Blocklist (Owner only): the phone numbers that can't book online, an add form and Unblock. */
export default function BlocklistPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<RowsSkeleton rows={4} />}>
        <BlocklistSection />
      </Suspense>
    </div>
  );
}

async function BlocklistSection() {
  const ctx = await ownerContext();
  if (!ctx) return null;
  const { staff, membership, t } = ctx;
  const s = t.settings.blocklist;

  const rows = await shopAdmin().listBlocked({ userId: staff.userId, shopId: membership.shopId });
  const items = rows.map((r) => {
    const display = formatPhone(r.phone);
    return {
      phone: r.phone,
      display,
      name: r.name === PLACEHOLDER_NAME ? null : r.name,
      unblockLabel: s.unblockLabel(display),
      confirmText: s.confirmUnblock(display),
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <BackToSettings label={t.settings.back} />
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">{s.title}</h1>
        <p className="max-w-prose leading-relaxed text-muted">{s.intro}</p>
      </div>
      <Blocklist
        shopId={membership.shopId}
        items={items}
        labels={{
          empty: s.empty,
          listLabel: s.listLabel,
          addLabel: s.addLabel,
          placeholder: s.placeholder,
          add: s.add,
          adding: s.adding,
          added: s.added,
          unblock: s.unblock,
          confirm: s.confirm,
          keep: s.keep,
          unblocked: s.unblocked,
          errors: s.errors,
        }}
      />
    </div>
  );
}
