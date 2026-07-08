"use client";

const item =
  "flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.5px]";
const swatch = "h-[11px] w-[11px] rounded-[3px] border-[1.5px] border-ink";

export function Legend() {
  return (
    <div className="border-ink bg-canvas pointer-events-none absolute right-6 bottom-6 z-30 flex flex-wrap items-center gap-4 rounded-md border-2 px-3.5 py-2.5">
      <span className={item}>
        <span className={`${swatch} bg-block-mint`} />
        Done
      </span>
      <span className={item}>
        <span
          className={`${swatch} bg-block-lilac`}
          style={{
            boxShadow:
              "0 0 0 1.5px var(--color-block-cream), 0 0 0 3px var(--color-ink)",
          }}
        />
        Learning
      </span>
      <span className={item}>
        <span className={`${swatch} bg-block-lilac opacity-40`} />
        Skipped
      </span>
      <span className={item}>
        <span className="border-ink h-0 w-3.5 border-t-[1.5px] border-dashed opacity-60" />
        Optional
      </span>
    </div>
  );
}
