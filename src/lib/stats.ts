import type { SupabaseClient } from "@supabase/supabase-js";

export type PlayerLite = { id: string; name: string; active: boolean };

export type TrajectoryPoint = Record<string, number | string> & { date: string };
export type TrajectoryResult = {
  players: PlayerLite[];
  dataset: TrajectoryPoint[];
};

export async function getRatingTrajectories(
  supabase: SupabaseClient,
): Promise<TrajectoryResult> {
  const { data: players, error: pErr } = await supabase
    .from("players")
    .select("id, name, active")
    .order("name", { ascending: true });
  if (pErr) throw new Error(pErr.message);

  const { data: matches, error: mErr } = await supabase
    .from("matches")
    .select("id, played_at")
    .order("played_at", { ascending: true });
  if (mErr) throw new Error(mErr.message);

  const matchIds = (matches ?? []).map((m) => m.id);
  const { data: history, error: hErr } = matchIds.length
    ? await supabase
        .from("rating_history")
        .select("match_id, player_id, rating_after")
        .in("match_id", matchIds)
    : { data: [], error: null };
  if (hErr) throw new Error(hErr.message);

  const byMatch: Record<string, Record<string, number>> = {};
  for (const h of history ?? []) {
    const mid = h.match_id as string;
    byMatch[mid] ??= {};
    byMatch[mid][h.player_id as string] = Number(h.rating_after);
  }

  const running: Record<string, number> = {};
  for (const p of players ?? []) running[p.id as string] = 1200;

  const dataset: TrajectoryPoint[] = [];
  const firstDate =
    (matches ?? [])[0]?.played_at ?? new Date(Date.now() - 86_400_000).toISOString();
  const seed: TrajectoryPoint = { date: firstDate };
  for (const p of players ?? []) seed[p.name as string] = 1200;
  dataset.push(seed);

  for (const m of matches ?? []) {
    const updates = byMatch[m.id as string] ?? {};
    for (const [pid, r] of Object.entries(updates)) running[pid] = r;
    const row: TrajectoryPoint = { date: m.played_at as string };
    for (const p of players ?? []) row[p.name as string] = running[p.id as string];
    dataset.push(row);
  }

  return { players: (players ?? []) as PlayerLite[], dataset };
}

export type Swing = {
  id: string;
  played_at: string;
  score_a: number;
  score_b: number;
  team_a_names: [string, string];
  team_b_names: [string, string];
  deltaA: number;
  deltaB: number;
  magnitude: number;
};

export async function getBiggestSwings(
  supabase: SupabaseClient,
  limit = 5,
): Promise<Swing[]> {
  const { data: matches, error: mErr } = await supabase
    .from("matches")
    .select(
      "id, team_a_p1, team_a_p2, team_b_p1, team_b_p2, score_a, score_b, played_at",
    );
  if (mErr) throw new Error(mErr.message);
  if (!matches || matches.length === 0) return [];

  const { data: history, error: hErr } = await supabase
    .from("rating_history")
    .select("match_id, player_id, delta")
    .in(
      "match_id",
      matches.map((m) => m.id),
    );
  if (hErr) throw new Error(hErr.message);

  const { data: players, error: pErr } = await supabase
    .from("players")
    .select("id, name");
  if (pErr) throw new Error(pErr.message);
  const nameById = Object.fromEntries((players ?? []).map((p) => [p.id, p.name]));

  const deltaByMatchPlayer: Record<string, number> = {};
  for (const h of history ?? []) {
    deltaByMatchPlayer[`${h.match_id}:${h.player_id}`] = Number(h.delta);
  }

  return matches
    .map((m) => {
      const deltaA = deltaByMatchPlayer[`${m.id}:${m.team_a_p1}`] ?? 0;
      const deltaB = deltaByMatchPlayer[`${m.id}:${m.team_b_p1}`] ?? 0;
      return {
        id: m.id,
        played_at: m.played_at,
        score_a: m.score_a,
        score_b: m.score_b,
        team_a_names: [nameById[m.team_a_p1] ?? "?", nameById[m.team_a_p2] ?? "?"] as [string, string],
        team_b_names: [nameById[m.team_b_p1] ?? "?", nameById[m.team_b_p2] ?? "?"] as [string, string],
        deltaA,
        deltaB,
        magnitude: Math.max(Math.abs(deltaA), Math.abs(deltaB)),
      };
    })
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, limit);
}

export type FormEntry = { matchId: string; won: boolean; playedAt: string };

// Last N match outcomes per player, ordered oldest → newest.
export async function getRecentForm(
  supabase: SupabaseClient,
  limit = 5,
): Promise<Record<string, FormEntry[]>> {
  const { data: matches, error: mErr } = await supabase
    .from("matches")
    .select("id, team_a_p1, team_a_p2, team_b_p1, team_b_p2, score_a, score_b, played_at")
    .order("played_at", { ascending: false });
  if (mErr) throw new Error(mErr.message);
  const perPlayer: Record<string, FormEntry[]> = {};
  for (const m of matches ?? []) {
    const aWin = m.score_a > m.score_b;
    const entries: [string, boolean][] = [
      [m.team_a_p1, aWin],
      [m.team_a_p2, aWin],
      [m.team_b_p1, !aWin],
      [m.team_b_p2, !aWin],
    ];
    for (const [pid, won] of entries) {
      perPlayer[pid] ??= [];
      if (perPlayer[pid].length < limit) {
        perPlayer[pid].push({ matchId: m.id, won, playedAt: m.played_at });
      }
    }
  }
  // Reverse each to be oldest→newest so the rightmost dot is the latest
  for (const pid of Object.keys(perPlayer)) perPlayer[pid].reverse();
  return perPlayer;
}

export type HeadlineNumbers = {
  totalMatches: number;
  totalPlayers: number;
  avgScoreDiff: number;
  topRating: number | null;
  topRatingName: string | null;
};

export async function getHeadlineNumbers(
  supabase: SupabaseClient,
): Promise<HeadlineNumbers> {
  const [{ count: matchCount }, { count: playerCount }, { data: topPlayer }, { data: margins }] =
    await Promise.all([
      supabase.from("matches").select("*", { count: "exact", head: true }),
      supabase.from("players").select("*", { count: "exact", head: true }).eq("active", true),
      supabase
        .from("players")
        .select("name, rating")
        .order("rating", { ascending: false })
        .limit(1),
      supabase.from("matches").select("score_a, score_b"),
    ]);

  const diffs = (margins ?? []).map((m) => Math.abs(m.score_a - m.score_b));
  const avg = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
  return {
    totalMatches: matchCount ?? 0,
    totalPlayers: playerCount ?? 0,
    avgScoreDiff: Math.round(avg * 10) / 10,
    topRating: topPlayer?.[0]?.rating ? Number(topPlayer[0].rating) : null,
    topRatingName: topPlayer?.[0]?.name ?? null,
  };
}
