import type { FormEntry } from "@/lib/stats";

// Five-slot last-form indicator. Filled square = win, outlined square = loss.
// Empty slots on the left for players with fewer than 5 matches.
export function FormStrip({ entries, slots = 5 }: { entries: FormEntry[]; slots?: number }) {
  const padding = Math.max(0, slots - entries.length);
  const pad = Array.from({ length: padding });
  const title = entries.length
    ? entries.map((e) => (e.won ? "W" : "L")).join(" ")
    : "no matches";
  return (
    <div className="flex items-center gap-1" title={title} aria-label={`Last ${entries.length} results: ${title}`}>
      {pad.map((_, i) => (
        <span
          key={`p-${i}`}
          aria-hidden
          className="inline-block h-2.5 w-2.5 border border-neutral-200"
        />
      ))}
      {entries.map((e, i) => (
        <span
          key={i}
          aria-hidden
          className={
            e.won
              ? "inline-block h-2.5 w-2.5 bg-ink"
              : "inline-block h-2.5 w-2.5 border border-ink"
          }
        />
      ))}
    </div>
  );
}
