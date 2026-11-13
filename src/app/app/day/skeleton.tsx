/*
 * The day while it loads (DESIGN.md → "States"): the title, the date bar and hairline-ruled
 * rows in the real layout (time column, name and Service, price), with a slow pulse that
 * stops under reduced motion. Desktop shows skeleton columns for the Owner's view too.
 */
const block = "rounded-md bg-line motion-safe:animate-pulse";

function Row({ i }: { i: number }) {
  return (
    <div className="flex min-h-16 items-center gap-4 border-b border-line py-3">
      <div className="flex w-16 shrink-0 flex-col gap-2">
        <div className={`${block} h-4 w-12`} />
        <div className={`${block} h-3 w-14`} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className={`${block} h-4`} style={{ width: `${70 - (i % 3) * 12}%` }} />
        <div className={`${block} h-3 w-1/3`} />
      </div>
      <div className={`${block} h-4 w-10`} />
    </div>
  );
}

export function DaySkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <div aria-hidden="true" className="flex flex-col gap-3">
        <div className={`${block} h-8 w-24`} />
        <div className="flex items-center gap-3">
          <div className={`${block} h-12 w-12 rounded-full`} />
          <div className="flex flex-1 flex-col items-center gap-2">
            <div className={`${block} h-3 w-12`} />
            <div className={`${block} h-4 w-28`} />
          </div>
          <div className={`${block} h-12 w-12 rounded-full`} />
        </div>
      </div>
      <div aria-hidden="true" className="border-t border-line">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Row key={i} i={i} />
        ))}
      </div>
    </div>
  );
}
