import { describe, it, expect } from "vitest";
import {
  applyMatch,
  baseK,
  expectedScore,
  marginMultiplier,
  newPlayer,
  rebuildFromZero,
  round1,
  round2,
  type MatchInput,
  type PlayerState,
} from "./elo";

function mk(id: string, over: Partial<PlayerState> = {}): PlayerState {
  return { ...newPlayer(id), ...over };
}

function stateMap(...ps: PlayerState[]): Record<string, PlayerState> {
  return Object.fromEntries(ps.map((p) => [p.id, p]));
}

describe("helpers", () => {
  it("baseK steps at 10 and 30 games", () => {
    expect(baseK(0)).toBe(40);
    expect(baseK(9)).toBe(40);
    expect(baseK(10)).toBe(24);
    expect(baseK(29)).toBe(24);
    expect(baseK(30)).toBe(16);
    expect(baseK(500)).toBe(16);
  });

  it("marginMultiplier: ~1 at 10-0, ~0.29 at 10-9", () => {
    expect(round2(marginMultiplier(10, 0))).toBe(1);
    expect(round2(marginMultiplier(10, 9))).toBe(0.29);
  });

  it("expectedScore is 0.5 at equal ratings", () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 12);
    expect(expectedScore(1400, 1000)).toBeGreaterThan(0.9);
  });
});

describe("applyMatch — equal teams", () => {
  it("equal teams, A wins 10-5 (provisional K=40)", () => {
    const states = stateMap(mk("a1"), mk("a2"), mk("b1"), mk("b2"));
    const m: MatchInput = {
      teamA: ["a1", "a2"],
      teamB: ["b1", "b2"],
      scoreA: 10,
      scoreB: 5,
    };
    const { updated, deltaA, deltaB, history } = applyMatch(states, m);
    // K = 40 * ln(6)/ln(11), delta = K * 0.5
    const expected = 40 * (Math.log(6) / Math.log(11)) * 0.5;
    expect(deltaA).toBeCloseTo(expected, 9);
    expect(deltaB).toBeCloseTo(-expected, 9);
    expect(updated.a1.rating).toBe(round1(1200 + expected));
    expect(updated.a2.rating).toBe(round1(1200 + expected));
    expect(updated.b1.rating).toBe(round1(1200 - expected));
    expect(updated.b2.rating).toBe(round1(1200 - expected));
    expect(updated.a1.wins).toBe(1);
    expect(updated.a1.losses).toBe(0);
    expect(updated.b1.losses).toBe(1);
    expect(updated.b1.wins).toBe(0);
    expect(updated.a1.games_played).toBe(1);
    expect(history).toHaveLength(4);
    expect(history[0].delta).toBe(round2(expected));
    expect(history[2].delta).toBe(round2(-expected));
  });

  it("equal teams, B wins 10-3", () => {
    const states = stateMap(mk("a1"), mk("a2"), mk("b1"), mk("b2"));
    const { deltaA, deltaB, updated } = applyMatch(states, {
      teamA: ["a1", "a2"],
      teamB: ["b1", "b2"],
      scoreA: 3,
      scoreB: 10,
    });
    expect(deltaA).toBeLessThan(0);
    expect(deltaB).toBeGreaterThan(0);
    expect(updated.a1.losses).toBe(1);
    expect(updated.b1.wins).toBe(1);
  });
});

describe("applyMatch — asymmetric", () => {
  it("lower-rated team upsets a higher-rated team", () => {
    const states = stateMap(
      mk("a1", { rating: 1000, games_played: 50 }),
      mk("a2", { rating: 1100, games_played: 50 }),
      mk("b1", { rating: 1400, games_played: 50 }),
      mk("b2", { rating: 1500, games_played: 50 }),
    );
    const { deltaA, deltaB } = applyMatch(states, {
      teamA: ["a1", "a2"],
      teamB: ["b1", "b2"],
      scoreA: 10,
      scoreB: 5,
    });
    // Expected A = 1/(1 + 10^((1450-1050)/400)) = 1/(1+10^1) = 1/11
    const eA = 1 / 11;
    const mm = Math.log(6) / Math.log(11);
    const k = 16 * mm;
    expect(deltaA).toBeCloseTo(k * (1 - eA), 9);
    expect(deltaB).toBeCloseTo(k * (0 - (1 - eA)), 9);
    // Big reward for the upset
    expect(deltaA).toBeGreaterThan(10);
  });
});

describe("applyMatch — K-factor regimes", () => {
  it("provisional K=40 path moves more than established K=16 path", () => {
    const provisional = stateMap(mk("a1"), mk("a2"), mk("b1"), mk("b2"));
    const established = stateMap(
      mk("a1", { games_played: 50 }),
      mk("a2", { games_played: 50 }),
      mk("b1", { games_played: 50 }),
      mk("b2", { games_played: 50 }),
    );
    const m: MatchInput = {
      teamA: ["a1", "a2"],
      teamB: ["b1", "b2"],
      scoreA: 10,
      scoreB: 0,
    };
    const p = applyMatch(provisional, m);
    const e = applyMatch(established, m);
    expect(p.deltaA).toBeCloseTo(40 * 0.5, 9); // 20
    expect(e.deltaA).toBeCloseTo(16 * 0.5, 9); // 8
    // Provisional team swings 2.5x as hard (40/16).
    expect(p.deltaA / e.deltaA).toBeCloseTo(40 / 16, 9);
  });

  it("mixed-experience team averages K per side (not zero-sum across teams)", () => {
    // A: one rookie (K=40), one veteran (K=16) -> team K_base = 28
    // B: two veterans (K=16, K=16) -> team K_base = 16
    const states = stateMap(
      mk("a1"),
      mk("a2", { games_played: 50 }),
      mk("b1", { games_played: 50 }),
      mk("b2", { games_played: 50 }),
    );
    const { deltaA, deltaB } = applyMatch(states, {
      teamA: ["a1", "a2"],
      teamB: ["b1", "b2"],
      scoreA: 10,
      scoreB: 0,
    });
    expect(deltaA).toBeCloseTo(28 * 0.5, 9); // 14
    expect(deltaB).toBeCloseTo(16 * -0.5, 9); // -8
    // Asymmetric — intentional per spec.
    expect(deltaA + deltaB).not.toBe(0);
  });
});

describe("applyMatch — margin multiplier", () => {
  it("10-0 sweep applies full K", () => {
    const states = stateMap(mk("a1"), mk("a2"), mk("b1"), mk("b2"));
    const { deltaA } = applyMatch(states, {
      teamA: ["a1", "a2"],
      teamB: ["b1", "b2"],
      scoreA: 10,
      scoreB: 0,
    });
    expect(deltaA).toBeCloseTo(40 * 0.5, 9); // 20
  });

  it("10-9 squeaker shrinks the swing to ~29% of the sweep", () => {
    const states = stateMap(mk("a1"), mk("a2"), mk("b1"), mk("b2"));
    const { deltaA } = applyMatch(states, {
      teamA: ["a1", "a2"],
      teamB: ["b1", "b2"],
      scoreA: 10,
      scoreB: 9,
    });
    const mm = Math.log(2) / Math.log(11);
    expect(deltaA).toBeCloseTo(40 * mm * 0.5, 9);
    expect(deltaA / 20).toBeLessThan(0.3);
    expect(deltaA / 20).toBeGreaterThan(0.28);
  });
});

describe("rebuildFromZero — multi-match sequence", () => {
  it("replays two matches and lands on the expected ratings and records", () => {
    const alice = "alice", bob = "bob", carol = "carol", dave = "dave";
    const matches: MatchInput[] = [
      // M1: Alice+Bob beat Carol+Dave 10-5
      { teamA: [alice, bob], teamB: [carol, dave], scoreA: 10, scoreB: 5 },
      // M2: Alice+Carol beat Bob+Dave 10-8
      { teamA: [alice, carol], teamB: [bob, dave], scoreA: 10, scoreB: 8 },
    ];
    const { finalStates, perMatch } = rebuildFromZero([alice, bob, carol, dave], matches);

    // M1: all K=40, margin = ln(6)/ln(11), delta = ±20 * mm
    const mm1 = Math.log(6) / Math.log(11);
    const d1 = 20 * mm1;
    // After M1: round1 rating used for M2
    const aliceAfterM1 = round1(1200 + d1);
    const carolAfterM1 = round1(1200 - d1);
    const bobAfterM1 = aliceAfterM1;
    const daveAfterM1 = carolAfterM1;

    // M2: teams (alice+carol) vs (bob+dave) -> both avg 1200 by symmetry
    const teamR_A_M2 = (aliceAfterM1 + carolAfterM1) / 2;
    const teamR_B_M2 = (bobAfterM1 + daveAfterM1) / 2;
    expect(teamR_A_M2).toBe(teamR_B_M2);

    const mm2 = Math.log(3) / Math.log(11);
    const d2 = 40 * mm2 * 0.5; // K_avg=40, (S-E)=0.5

    expect(finalStates[alice].rating).toBe(round1(aliceAfterM1 + d2));
    expect(finalStates[carol].rating).toBe(round1(carolAfterM1 + d2));
    expect(finalStates[bob].rating).toBe(round1(bobAfterM1 - d2));
    expect(finalStates[dave].rating).toBe(round1(daveAfterM1 - d2));

    expect(finalStates[alice].games_played).toBe(2);
    expect(finalStates[alice].wins).toBe(2);
    expect(finalStates[alice].losses).toBe(0);
    expect(finalStates[carol].wins).toBe(1);
    expect(finalStates[carol].losses).toBe(1);
    expect(finalStates[bob].wins).toBe(1);
    expect(finalStates[bob].losses).toBe(1);
    expect(finalStates[dave].wins).toBe(0);
    expect(finalStates[dave].losses).toBe(2);

    // Every match produced four history rows
    expect(perMatch[0].history).toHaveLength(4);
    expect(perMatch[1].history).toHaveLength(4);
    // rating_before on M2 matches stored M1 ratings
    const aliceM2 = perMatch[1].history.find((h) => h.player_id === alice)!;
    expect(aliceM2.rating_before).toBe(aliceAfterM1);
  });
});
