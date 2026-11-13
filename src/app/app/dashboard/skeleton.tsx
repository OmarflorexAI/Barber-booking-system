/*
 * The Dashboard while its numbers load, in the real layout (DESIGN.md → "States": no
 * spinners): title + the week pill, the hero card, three stat cards, the chart and the
 * per-Barber card. Blocks use the --line tone with a pulse that stops under reduced motion.
 */
const block = "rounded-md bg-line motion-safe:animate-pulse";
const card = "card-depth rounded-2xl border border-line bg-surface p-5 lg:p-6";

export function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className={`${block} h-7 w-36`} />
        <div className="flex h-14 items-center gap-3 rounded-full border border-line bg-surface p-1 sm:min-w-72">
          <div className={`${block} h-12 w-12 rounded-full`} />
          <div className={`${block} mx-auto h-5 w-28`} />
          <div className={`${block} h-12 w-12 rounded-full`} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex flex-col gap-4">
          <div className={`${card} flex flex-col gap-4`}>
            <div className={`${block} h-4 w-36`} />
            <div className={`${block} h-12 w-24 lg:h-16`} />
            <div className={`${block} h-4 w-32`} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${card} flex flex-col gap-3 ${i === 2 ? "col-span-2 sm:col-span-1" : ""}`}>
                <div className={`${block} h-4 w-20`} />
                <div className={`${block} h-7 w-14`} />
                <div className={`${block} h-10 w-full`} />
                <div className={`${block} h-3.5 w-24`} />
              </div>
            ))}
          </div>
          <div className={card}>
            <div className={`${block} mb-6 h-5 w-36`} />
            <div className="flex h-44 items-end gap-3 lg:h-52">
              {[40, 65, 30, 80, 55, 90, 20].map((h, i) => (
                <div key={i} className={`${block} flex-1 rounded-t-lg rounded-b-none`} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
        <div className={`${card} flex flex-col gap-5`}>
          <div className={`${block} h-5 w-40`} />
          {[70, 45, 85].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`${block} h-10 w-10 shrink-0 rounded-full`} />
              <div className="flex flex-1 flex-col gap-2">
                <div className={`${block} h-4 w-24`} />
                <div className={`${block} h-2 rounded-full`} style={{ width: `${w}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
