// Seed 6 players and 15 matches so the leaderboard isn't empty on first load.
// Idempotent: wipes matches + rating_history and resets player stats before
// replaying the fixture list. Run with: pnpm seed

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { applyMatch, newPlayer, type MatchInput, type PlayerState } from "../src/lib/elo";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PLAYER_NAMES = ["Alex", "Blair", "Casey", "Dana", "Eli", "Finn"] as const;

type Fixture = {
  day: number; // days ago
  a: [string, string];
  b: [string, string];
  scoreA: number;
  scoreB: number;
};

// 15 matches. Teams swap around to build a real-looking ladder.
const FIXTURES: Fixture[] = [
  { day: 14, a: ["Alex", "Blair"], b: ["Casey", "Dana"], scoreA: 10, scoreB: 7 },
  { day: 14, a: ["Eli", "Finn"], b: ["Alex", "Casey"], scoreA: 10, scoreB: 5 },
  { day: 13, a: ["Blair", "Dana"], b: ["Eli", "Finn"], scoreA: 8, scoreB: 10 },
  { day: 12, a: ["Alex", "Eli"], b: ["Blair", "Casey"], scoreA: 10, scoreB: 9 },
  { day: 11, a: ["Dana", "Finn"], b: ["Alex", "Blair"], scoreA: 10, scoreB: 4 },
  { day: 10, a: ["Casey", "Eli"], b: ["Dana", "Finn"], scoreA: 6, scoreB: 10 },
  { day: 9, a: ["Alex", "Dana"], b: ["Blair", "Eli"], scoreA: 10, scoreB: 8 },
  { day: 8, a: ["Casey", "Finn"], b: ["Alex", "Eli"], scoreA: 10, scoreB: 6 },
  { day: 7, a: ["Blair", "Finn"], b: ["Casey", "Dana"], scoreA: 7, scoreB: 10 },
  { day: 6, a: ["Alex", "Finn"], b: ["Blair", "Dana"], scoreA: 10, scoreB: 10 - 2 }, // 10-8
  { day: 5, a: ["Eli", "Dana"], b: ["Casey", "Alex"], scoreA: 10, scoreB: 3 },
  { day: 4, a: ["Blair", "Eli"], b: ["Finn", "Dana"], scoreA: 10, scoreB: 9 },
  { day: 3, a: ["Alex", "Casey"], b: ["Blair", "Finn"], scoreA: 5, scoreB: 10 },
  { day: 2, a: ["Dana", "Eli"], b: ["Blair", "Alex"], scoreA: 10, scoreB: 7 },
  { day: 1, a: ["Casey", "Finn"], b: ["Dana", "Eli"], scoreA: 8, scoreB: 10 },
];

async function main() {
  console.log("→ wiping existing data");
  await supabase.from("rating_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("players").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  console.log("→ inserting players");
  const { data: inserted, error: pErr } = await supabase
    .from("players")
    .insert(PLAYER_NAMES.map((name) => ({ name })))
    .select("*");
  if (pErr) throw pErr;
  const idByName: Record<string, string> = Object.fromEntries(
    (inserted ?? []).map((p) => [p.name as string, p.id as string]),
  );

  let states: Record<string, PlayerState> = {};
  for (const name of PLAYER_NAMES) states[idByName[name]] = newPlayer(idByName[name]);

  console.log(`→ applying ${FIXTURES.length} matches`);
  const now = Date.now();
  for (const f of FIXTURES) {
    const playedAt = new Date(now - f.day * 86_400_000 + Math.floor(Math.random() * 3_600_000));
    const input: MatchInput = {
      teamA: [idByName[f.a[0]], idByName[f.a[1]]],
      teamB: [idByName[f.b[0]], idByName[f.b[1]]],
      scoreA: f.scoreA,
      scoreB: f.scoreB,
    };

    const { data: match, error: mErr } = await supabase
      .from("matches")
      .insert({
        team_a_p1: input.teamA[0],
        team_a_p2: input.teamA[1],
        team_b_p1: input.teamB[0],
        team_b_p2: input.teamB[1],
        score_a: f.scoreA,
        score_b: f.scoreB,
        played_at: playedAt.toISOString(),
      })
      .select("id")
      .single();
    if (mErr) throw mErr;

    const result = applyMatch(states, input);
    states = result.updated;

    const { error: hErr } = await supabase.from("rating_history").insert(
      result.history.map((h) => ({ ...h, match_id: match.id })),
    );
    if (hErr) throw hErr;
  }

  console.log("→ writing final player totals");
  for (const name of PLAYER_NAMES) {
    const s = states[idByName[name]];
    const { error } = await supabase
      .from("players")
      .update({
        rating: s.rating,
        games_played: s.games_played,
        wins: s.wins,
        losses: s.losses,
      })
      .eq("id", idByName[name]);
    if (error) throw error;
  }

  console.log("✓ seed complete");
  const { data: final } = await supabase
    .from("players")
    .select("name, rating, wins, losses, games_played")
    .order("rating", { ascending: false });
  console.table(final);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
