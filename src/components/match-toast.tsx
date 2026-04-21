import { getReadClient } from "@/lib/supabase/server";
import { formatDelta } from "@/lib/format";
import type { Player } from "@/lib/types";

type HistoryWithPlayer = {
  player_id: string;
  delta: number;
  rating_after: number;
};

export async function MatchToast({ matchId }: { matchId: string }) {
  const supabase = getReadClient();
  const { data: hist, error } = await supabase
    .from("rating_history")
    .select("player_id, delta, rating_after")
    .eq("match_id", matchId);
  if (error || !hist || hist.length === 0) return null;
  const { data: players } = await supabase
    .from("players")
    .select("id, name")
    .in(
      "id",
      (hist as HistoryWithPlayer[]).map((h) => h.player_id),
    );
  const nameById: Record<string, string> = Object.fromEntries(
    (players ?? []).map((p: Pick<Player, "id" | "name">) => [p.id, p.name]),
  );
  const rows = (hist as HistoryWithPlayer[]).sort((a, b) => b.delta - a.delta);
  return (
    <div className="mb-8 border border-ink px-4 py-3 text-sm">
      <p className="font-medium">Match recorded</p>
      <ul className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 font-mono">
        {rows.map((r) => (
          <li key={r.player_id} className="flex justify-between">
            <span>{nameById[r.player_id] ?? "—"}</span>
            <span>
              {formatDelta(Number(r.delta))} → {Number(r.rating_after).toFixed(1)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
