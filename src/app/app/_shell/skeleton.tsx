/*
 * Loading skeletons in the shell's real layout (DESIGN.md → "States": no spinners). The
 * blocks use the --line tone with a slow pulse that stops under reduced motion.
 */
const block = "rounded-md bg-line motion-safe:animate-pulse";

/** Rows shaped like a hairline-ruled list, for page bodies. */
export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <div className={`${block} mb-6 h-7 w-40`} />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex min-h-14 items-center gap-4 border-b border-line">
          <div className={`${block} h-4 w-14`} />
          <div className={`${block} h-4 flex-1`} style={{ maxWidth: `${60 - i * 6}%` }} />
        </div>
      ))}
    </div>
  );
}

/** The whole shell while the signed-in person loads: header, sidebar, rows and the tab bar. */
export function ShellSkeleton() {
  return (
    <div aria-busy="true" className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div aria-hidden="true" className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface px-7 py-6 lg:flex">
        <div className={`${block} h-7 w-36`} />
        <div className={`${block} h-4 w-28`} />
        <div className="flex flex-col gap-3 pt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${block} h-8 w-full`} />
          ))}
        </div>
      </div>
      <div className="flex min-h-dvh flex-col">
        <div aria-hidden="true" className="flex min-h-14 items-center justify-between gap-3 px-4 pt-2 pb-2 lg:hidden">
          <div className={`${block} h-5 w-36`} />
          <div className="flex gap-2">
            <div className={`${block} h-11 w-20 rounded-full`} />
            <div className={`${block} h-11 w-11 rounded-full`} />
          </div>
        </div>
        <div className="flex-1 px-4 pt-2 pb-24 lg:px-8 lg:py-8">
          <RowsSkeleton />
        </div>
      </div>
      <div aria-hidden="true" className="fixed inset-x-0 bottom-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className={`${block} h-6 w-6`} />
              <div className={`${block} h-3 w-10`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
