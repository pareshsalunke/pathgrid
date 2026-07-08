import { cn } from "@/lib/utils";

/** Centered page gutter. Content sections cap at 1280px (design containerMax);
 *  the header rides the wider 1440px app frame. */
export function Container({
  wide = false,
  className,
  children,
}: {
  wide?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-8",
        wide ? "max-w-[1440px]" : "max-w-[1280px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
