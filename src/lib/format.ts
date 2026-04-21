// Formatters for monospace numeric display. Uses U+2212 MINUS for negatives so
// signed numbers line up with unsigned ones.

export function formatRating(r: number): string {
  return r.toFixed(1);
}

export function formatDelta(d: number): string {
  const sign = d > 0 ? "+" : d < 0 ? "−" : "±";
  return `${sign}${Math.abs(d).toFixed(2)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
