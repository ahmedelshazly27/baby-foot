import Link from "next/link";
import { Nav } from "@/components/nav";
import { DeleteMatchButton } from "@/components/delete-match-button";
import { getReadClient } from "@/lib/supabase/server";
import { formatDate, formatDelta } from "@/lib/format";
import type { Match, Player } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = Match & {
  deltaA: number;
  deltaB: number;
  affected: number;
};

export default async function HistoryPage() {
  const supabase = getReadClient();

  // Fetch all matches chronologically to compute affected sets, then present
  // reverse-chronologically.
  const { data: asc, error } = await supabase
    .from("matches")
    .select("*")
    .order("played_at", { ascending: true });
  if (error) throw new Error(error.message);
  const matchesAsc = (asc ?? []) as Match[];

  // Walk backwards: affected[i] = distinct players in match i and all later matches.
  const affected: Record<string, number> = {};
  const running = new Set<string>();
  for (let i = matchesAsc.length - 1; i >= 0; i--) {
    const m = matchesAsc[i];
    running.add(m.team_a_p1);
    running.add(m.team_a_p2);
    running.add(m.team_b_p1);
    running.add(m.team_b_p2);
    affected[m.id] = running.size;
  }

  // Per-match team deltas: pull one representative delta per team from rating_history.
  const matchIds = matchesAsc.map((m) => m.id);
  const { data: histRows } = matchIds.length
    ? await supabase
        .from("rating_history")
        .select("match_id, player_id, delta")
        .in("match_id", matchIds)
    : { data: [] };
  const deltaByMatchPlayer: Record<string, number> = {};
  for (const r of histRows ?? []) {
    deltaByMatchPlayer[`${r.match_id}:${r.player_id}`] = Number(r.delta);
  }

  const { data: allPlayers } = await supabase.from("players").select("id, name");
  const nameById: Record<string, string> = Object.fromEntries(
    (allPlayers ?? []).map((p: Pick<Player, "id" | "name">) => [p.id, p.name]),
  );

  const rows: Row[] = matchesAsc
    .slice()
    .reverse()
    .map((m) => ({
      ...m,
      deltaA: deltaByMatchPlayer[`${m.id}:${m.team_a_p1}`] ?? 0,
      deltaB: deltaByMatchPlayer[`${m.id}:${m.team_b_p1}`] ?? 0,
      affected: affected[m.id] ?? 0,
    }));

  return (
    <>
      <Nav />
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight">Match history</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Editing or deleting a match replays every rating from that point forward.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="border border-dashed border-neutral-300 py-16 text-center">
          <p className="text-sm text-neutral-500">No matches yet.</p>
          <Link href="/matches/new" className="mt-3 inline-block text-sm underline">
            Log the first match
          </Link>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Team A</th>
              <th className="text-center">Score</th>
              <th>Team B</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-xs text-neutral-500">{formatDate(r.played_at)}</td>
                <td>
                  <div>
                    {nameById[r.team_a_p1] ?? "?"} · {nameById[r.team_a_p2] ?? "?"}
                  </div>
                  <div className="font-mono text-xs text-neutral-500">{formatDelta(r.deltaA)}</div>
                </td>
                <td className="text-center font-mono">
                  {r.score_a}&ndash;{r.score_b}
                </td>
                <td>
                  <div>
                    {nameById[r.team_b_p1] ?? "?"} · {nameById[r.team_b_p2] ?? "?"}
                  </div>
                  <div className="font-mono text-xs text-neutral-500">{formatDelta(r.deltaB)}</div>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/matches/${r.id}/edit`}
                      className="text-xs text-neutral-500 hover:text-ink"
                    >
                      Edit
                    </Link>
                    <DeleteMatchButton matchId={r.id} affectedPlayers={r.affected} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
