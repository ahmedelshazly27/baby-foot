// Rating rebuild helpers. Supabase JS has no multi-statement transactions, so
// we read all players + all matches ordered by played_at, replay from 1200
// using the pure ELO engine, then write back (players, rating_history).
// Callers pass the admin client (service role).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyMatch,
  newPlayer,
  type MatchInput,
  type PlayerState,
} from "@/lib/elo";
import type { Match, Player } from "@/lib/types";

export type MatchRow = Match;

export async function rebuildAll(supabase: SupabaseClient): Promise<{
  affectedPlayers: number;
  matchesReplayed: number;
}> {
  const { data: players, error: pErr } = await supabase.from("players").select("*");
  if (pErr) throw new Error(pErr.message);
  const { data: matches, error: mErr } = await supabase
    .from("matches")
    .select("*")
    .order("played_at", { ascending: true });
  if (mErr) throw new Error(mErr.message);

  let states: Record<string, PlayerState> = {};
  for (const p of (players ?? []) as Player[]) states[p.id] = newPlayer(p.id);

  const historyRows: Array<{
    player_id: string;
    match_id: string;
    rating_before: number;
    rating_after: number;
    delta: number;
  }> = [];

  for (const m of (matches ?? []) as MatchRow[]) {
    const mi: MatchInput = {
      teamA: [m.team_a_p1, m.team_a_p2],
      teamB: [m.team_b_p1, m.team_b_p2],
      scoreA: m.score_a,
      scoreB: m.score_b,
    };
    const res = applyMatch(states, mi);
    states = res.updated;
    for (const h of res.history) {
      historyRows.push({ ...h, match_id: m.id });
    }
  }

  // Wipe and re-insert rating_history
  const { error: delErr } = await supabase.from("rating_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) throw new Error(delErr.message);

  if (historyRows.length > 0) {
    const { error: insErr } = await supabase.from("rating_history").insert(historyRows);
    if (insErr) throw new Error(insErr.message);
  }

  // Update each player's current rating, games_played, wins, losses
  const updates = (players ?? []).map((p: Player) => {
    const s = states[p.id] ?? newPlayer(p.id);
    return {
      id: p.id,
      rating: s.rating,
      games_played: s.games_played,
      wins: s.wins,
      losses: s.losses,
    };
  });
  for (const u of updates) {
    const { error } = await supabase
      .from("players")
      .update({
        rating: u.rating,
        games_played: u.games_played,
        wins: u.wins,
        losses: u.losses,
      })
      .eq("id", u.id);
    if (error) throw new Error(error.message);
  }

  return {
    affectedPlayers: updates.length,
    matchesReplayed: (matches ?? []).length,
  };
}

// Count the set of players whose ratings would move if a given match were
// edited or deleted — i.e. anyone who played in that match OR any later one.
export async function countAffectedByMatchChange(
  supabase: SupabaseClient,
  matchId: string,
): Promise<number> {
  const { data: target, error: tErr } = await supabase
    .from("matches")
    .select("played_at")
    .eq("id", matchId)
    .maybeSingle();
  if (tErr) throw new Error(tErr.message);
  if (!target) return 0;
  const { data: later, error: lErr } = await supabase
    .from("matches")
    .select("team_a_p1, team_a_p2, team_b_p1, team_b_p2")
    .gte("played_at", target.played_at);
  if (lErr) throw new Error(lErr.message);
  const ids = new Set<string>();
  for (const m of later ?? []) {
    ids.add(m.team_a_p1);
    ids.add(m.team_a_p2);
    ids.add(m.team_b_p1);
    ids.add(m.team_b_p2);
  }
  return ids.size;
}
