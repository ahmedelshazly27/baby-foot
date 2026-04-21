"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/server";
import { applyMatch, type MatchInput } from "@/lib/elo";
import type { Player } from "@/lib/types";

export type FormState = { error?: string };

function parseScore(raw: FormDataEntryValue | null): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 10) {
    throw new Error("Scores must be integers in 0–10.");
  }
  return n;
}

export async function createMatch(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // TODO: Supabase magic-link auth — gate this action behind a session.
  let matchId: string | null = null;
  try {
    const a1 = String(formData.get("team_a_p1") ?? "");
    const a2 = String(formData.get("team_a_p2") ?? "");
    const b1 = String(formData.get("team_b_p1") ?? "");
    const b2 = String(formData.get("team_b_p2") ?? "");
    const scoreA = parseScore(formData.get("score_a"));
    const scoreB = parseScore(formData.get("score_b"));
    const playedAtRaw = String(formData.get("played_at") ?? "");

    if (![a1, a2, b1, b2].every(Boolean)) {
      return { error: "Pick all four players." };
    }
    if (new Set([a1, a2, b1, b2]).size !== 4) {
      return { error: "The same player can't appear twice." };
    }
    const winnerCount = [scoreA, scoreB].filter((s) => s === 10).length;
    const loserOk = (scoreA === 10 ? scoreB : scoreA) >= 0 && (scoreA === 10 ? scoreB : scoreA) <= 9;
    if (winnerCount !== 1 || !loserOk) {
      return { error: "Exactly one team must reach 10; the other sits in 0–9." };
    }
    const playedAt = playedAtRaw ? new Date(playedAtRaw) : new Date();
    if (Number.isNaN(playedAt.getTime())) {
      return { error: "Invalid date." };
    }
    if (playedAt.getTime() > Date.now() + 60_000) {
      return { error: "Match date can't be in the future." };
    }

    const supabase = getAdminClient();

    // Fetch the four current player rows (rating + games_played matter)
    const { data: playerRows, error: pErr } = await supabase
      .from("players")
      .select("*")
      .in("id", [a1, a2, b1, b2]);
    if (pErr) return { error: pErr.message };
    if (!playerRows || playerRows.length !== 4) {
      return { error: "One of the selected players no longer exists." };
    }
    const byId: Record<string, Player> = Object.fromEntries(
      (playerRows as Player[]).map((p) => [p.id, p]),
    );
    for (const id of [a1, a2, b1, b2]) {
      if (!byId[id].active) return { error: `${byId[id].name} is inactive.` };
    }

    // Insert the match row first so we have its id for history
    const { data: inserted, error: mErr } = await supabase
      .from("matches")
      .insert({
        team_a_p1: a1,
        team_a_p2: a2,
        team_b_p1: b1,
        team_b_p2: b2,
        score_a: scoreA,
        score_b: scoreB,
        played_at: playedAt.toISOString(),
      })
      .select("id")
      .single();
    if (mErr) return { error: mErr.message };
    matchId = inserted.id as string;

    // If the new match is chronologically earliest-among-edits, we'd need a
    // full rebuild. For the simple append case (played_at is >= the latest
    // existing match), we can forward-apply. Check now.
    const { data: latestRows, error: lErr } = await supabase
      .from("matches")
      .select("played_at")
      .neq("id", matchId)
      .order("played_at", { ascending: false })
      .limit(1);
    if (lErr) return { error: lErr.message };
    const latest = latestRows?.[0]?.played_at ? new Date(latestRows[0].played_at) : null;
    const isAppend = !latest || playedAt.getTime() >= latest.getTime();

    if (isAppend) {
      const states = Object.fromEntries(
        (playerRows as Player[]).map((p) => [
          p.id,
          {
            id: p.id,
            rating: Number(p.rating),
            games_played: p.games_played,
            wins: p.wins,
            losses: p.losses,
          },
        ]),
      );
      const input: MatchInput = {
        teamA: [a1, a2],
        teamB: [b1, b2],
        scoreA,
        scoreB,
      };
      const result = applyMatch(states, input);

      const { error: hErr } = await supabase.from("rating_history").insert(
        result.history.map((h) => ({ ...h, match_id: matchId })),
      );
      if (hErr) return { error: hErr.message };

      for (const id of [a1, a2, b1, b2]) {
        const s = result.updated[id];
        const { error: uErr } = await supabase
          .from("players")
          .update({
            rating: s.rating,
            games_played: s.games_played,
            wins: s.wins,
            losses: s.losses,
          })
          .eq("id", id);
        if (uErr) return { error: uErr.message };
      }
    } else {
      // Back-dated match — rebuild the whole rating trail.
      const { rebuildAll } = await import("@/lib/rebuild");
      await rebuildAll(supabase);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }

  revalidatePath("/");
  revalidatePath("/matches");
  redirect(`/?match=${matchId}`);
}
