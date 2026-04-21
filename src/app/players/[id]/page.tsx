import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { RatingSparkline } from "@/components/rating-sparkline";
import { getReadClient } from "@/lib/supabase/server";
import { formatDate, formatDelta, formatRating } from "@/lib/format";
import type { Match, Player, RatingHistoryRow } from "@/lib/types";

export const dynamic = "force-dynamic";

type MatchWithDelta = Match & { playerDelta: number };

async function getRank(supabase: ReturnType<typeof getReadClient>, rating: number): Promise<number> {
  const { count } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .gt("rating", rating);
  return (count ?? 0) + 1;
}

async function getRatingTrail(
  supabase: ReturnType<typeof getReadClient>,
  playerId: string,
): Promise<RatingHistoryRow[]> {
  const { data, error } = await supabase
    .from("rating_history")
    .select("*, matches!inner(played_at)")
    .eq("player_id", playerId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RatingHistoryRow[];
}

async function getRecentMatches(
  supabase: ReturnType<typeof getReadClient>,
  playerId: string,
): Promise<MatchWithDelta[]> {
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .or(
      `team_a_p1.eq.${playerId},team_a_p2.eq.${playerId},team_b_p1.eq.${playerId},team_b_p2.eq.${playerId}`,
    )
    .order("played_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  if (!matches || matches.length === 0) return [];
  const matchIds = matches.map((m) => m.id);
  const { data: deltas } = await supabase
    .from("rating_history")
    .select("match_id, delta")
    .eq("player_id", playerId)
    .in("match_id", matchIds);
  const deltaByMatch: Record<string, number> = Object.fromEntries(
    (deltas ?? []).map((d) => [d.match_id, Number(d.delta)]),
  );
  return (matches as Match[]).map((m) => ({
    ...m,
    playerDelta: deltaByMatch[m.id] ?? 0,
  }));
}

async function getPlayerNames(
  supabase: ReturnType<typeof getReadClient>,
  ids: string[],
): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.from("players").select("id, name").in("id", ids);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.name]));
}

export default async function PlayerPage({ params }: { params: { id: string } }) {
  const supabase = getReadClient();
  const { data: player, error: pErr } = await supabase
    .from("players")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!player) notFound();
  const p = player as Player;

  const [rank, trail, recent] = await Promise.all([
    getRank(supabase, p.rating),
    getRatingTrail(supabase, params.id),
    getRecentMatches(supabase, params.id),
  ]);

  const matchPlayerIds = new Set<string>();
  for (const m of recent) {
    matchPlayerIds.add(m.team_a_p1);
    matchPlayerIds.add(m.team_a_p2);
    matchPlayerIds.add(m.team_b_p1);
    matchPlayerIds.add(m.team_b_p2);
  }
  const names = await getPlayerNames(supabase, Array.from(matchPlayerIds));

  const sparkline = [
    { idx: 0, rating: 1200 },
    ...trail.map((h, i) => ({ idx: i + 1, rating: Number(h.rating_after) })),
  ];

  return (
    <>
      <Nav />
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">{p.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Rank #{rank} · {p.wins}&ndash;{p.losses} in {p.games_played} game
            {p.games_played === 1 ? "" : "s"}
            {!p.active && " · inactive"}
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl">{formatRating(p.rating)}</div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">Rating</div>
        </div>
      </header>

      <section className="mb-10">
        <h2 className="mb-2 text-sm uppercase tracking-wider text-neutral-500">
          Rating trail
        </h2>
        <RatingSparkline points={sparkline} />
      </section>

      <section>
        <h2 className="mb-2 text-sm uppercase tracking-wider text-neutral-500">
          Last {Math.min(20, recent.length)} match{recent.length === 1 ? "" : "es"}
        </h2>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">No matches yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Team A</th>
                <th className="text-center">Score</th>
                <th>Team B</th>
                <th className="text-right">Δ</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m) => {
                const onA = m.team_a_p1 === p.id || m.team_a_p2 === p.id;
                const teamA = `${names[m.team_a_p1] ?? "?"} · ${names[m.team_a_p2] ?? "?"}`;
                const teamB = `${names[m.team_b_p1] ?? "?"} · ${names[m.team_b_p2] ?? "?"}`;
                return (
                  <tr key={m.id}>
                    <td className="font-mono text-xs text-neutral-500">
                      {formatDate(m.played_at)}
                    </td>
                    <td className={onA ? "font-medium" : ""}>{teamA}</td>
                    <td className="text-center font-mono">
                      {m.score_a}&ndash;{m.score_b}
                    </td>
                    <td className={!onA ? "font-medium" : ""}>{teamB}</td>
                    <td className="text-right font-mono">
                      {formatDelta(m.playerDelta)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <div className="mt-10 text-sm">
        <Link href="/" className="text-neutral-500 hover:text-ink">
          ← Leaderboard
        </Link>
      </div>
    </>
  );
}
