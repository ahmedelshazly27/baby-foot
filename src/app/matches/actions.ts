"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/server";
import { rebuildAll } from "@/lib/rebuild";
import type { Player } from "@/lib/types";

export type FormState = { error?: string };

function parseScore(raw: FormDataEntryValue | null): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 10) {
    throw new Error("Scores must be integers in 0–10.");
  }
  return n;
}

export async function deleteMatch(_prev: FormState, formData: FormData): Promise<FormState> {
  // TODO: Supabase magic-link auth — gate this action behind a session.
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing match id." };
  const supabase = getAdminClient();
  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) return { error: error.message };
  try {
    await rebuildAll(supabase);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Rebuild failed." };
  }
  revalidatePath("/");
  revalidatePath("/matches");
  redirect("/matches");
}

export async function updateMatch(_prev: FormState, formData: FormData): Promise<FormState> {
  // TODO: Supabase magic-link auth — gate this action behind a session.
  try {
    const id = String(formData.get("id") ?? "");
    const a1 = String(formData.get("team_a_p1") ?? "");
    const a2 = String(formData.get("team_a_p2") ?? "");
    const b1 = String(formData.get("team_b_p1") ?? "");
    const b2 = String(formData.get("team_b_p2") ?? "");
    const scoreA = parseScore(formData.get("score_a"));
    const scoreB = parseScore(formData.get("score_b"));
    const playedAtRaw = String(formData.get("played_at") ?? "");

    if (!id) return { error: "Missing match id." };
    if (![a1, a2, b1, b2].every(Boolean)) return { error: "Pick all four players." };
    if (new Set([a1, a2, b1, b2]).size !== 4) {
      return { error: "The same player can't appear twice." };
    }
    const winnerCount = [scoreA, scoreB].filter((s) => s === 10).length;
    const loser = scoreA === 10 ? scoreB : scoreA;
    if (winnerCount !== 1 || loser < 0 || loser > 9) {
      return { error: "Exactly one team must reach 10; the other sits in 0–9." };
    }
    const playedAt = playedAtRaw ? new Date(playedAtRaw) : new Date();
    if (Number.isNaN(playedAt.getTime())) return { error: "Invalid date." };
    if (playedAt.getTime() > Date.now() + 60_000) {
      return { error: "Match date can't be in the future." };
    }

    const supabase = getAdminClient();

    // Verify player existence; note they may be inactive (editing historical
    // match — the original line-up must still be referenceable).
    const { data: players } = await supabase
      .from("players")
      .select("id")
      .in("id", [a1, a2, b1, b2]);
    if (!players || players.length !== 4) {
      return { error: "One of the selected players no longer exists." };
    }

    const { error: uErr } = await supabase
      .from("matches")
      .update({
        team_a_p1: a1,
        team_a_p2: a2,
        team_b_p1: b1,
        team_b_p2: b2,
        score_a: scoreA,
        score_b: scoreB,
        played_at: playedAt.toISOString(),
      })
      .eq("id", id);
    if (uErr) return { error: uErr.message };

    await rebuildAll(supabase);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }

  revalidatePath("/");
  revalidatePath("/matches");
  redirect("/matches");
}

// Utility for the edit page: the initial player roster including any who are
// now inactive but still referenced by this match.
export async function loadPlayersForEdit(matchId: string): Promise<Player[]> {
  const supabase = getAdminClient();
  const { data: match } = await supabase
    .from("matches")
    .select("team_a_p1, team_a_p2, team_b_p1, team_b_p2")
    .eq("id", matchId)
    .maybeSingle();
  const referenced = match
    ? [match.team_a_p1, match.team_a_p2, match.team_b_p1, match.team_b_p2]
    : [];
  const { data } = await supabase
    .from("players")
    .select("*")
    .or(`active.eq.true,id.in.(${referenced.join(",") || "00000000-0000-0000-0000-000000000000"})`)
    .order("name", { ascending: true });
  return (data ?? []) as Player[];
}
