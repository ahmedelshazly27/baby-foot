// Pure ELO engine for 2v2 foosball. No I/O. All math in full precision;
// values are rounded only at the boundaries (ratings to 1 decimal,
// deltas to 2). Storage is rounded — reads from the DB carry rounded values
// back in, and that is what the next match consumes.

export const STARTING_RATING = 1200;

export type PlayerState = {
  id: string;
  rating: number;
  games_played: number;
  wins: number;
  losses: number;
};

export type MatchInput = {
  teamA: [string, string];
  teamB: [string, string];
  scoreA: number;
  scoreB: number;
};

export type HistoryRow = {
  player_id: string;
  rating_before: number;
  rating_after: number;
  delta: number;
};

export type MatchResult = {
  updated: Record<string, PlayerState>;
  deltaA: number;
  deltaB: number;
  expectedA: number;
  history: HistoryRow[];
};

export const round1 = (x: number) => Math.round(x * 10) / 10;
export const round2 = (x: number) => Math.round(x * 100) / 100;

export function baseK(gamesPlayed: number): number {
  if (gamesPlayed < 10) return 40;
  if (gamesPlayed < 30) return 24;
  return 16;
}

export function marginMultiplier(scoreA: number, scoreB: number): number {
  const diff = Math.abs(scoreA - scoreB);
  return Math.log(diff + 1) / Math.log(11);
}

export function expectedScore(teamRating: number, oppRating: number): number {
  return 1 / (1 + Math.pow(10, (oppRating - teamRating) / 400));
}

export function newPlayer(id: string): PlayerState {
  return { id, rating: STARTING_RATING, games_played: 0, wins: 0, losses: 0 };
}

export function applyMatch(
  states: Record<string, PlayerState>,
  match: MatchInput,
): MatchResult {
  const [a1, a2] = match.teamA;
  const [b1, b2] = match.teamB;
  const ids = [a1, a2, b1, b2];
  for (const id of ids) {
    if (!states[id]) throw new Error(`applyMatch: missing state for player ${id}`);
  }
  if (new Set(ids).size !== 4) {
    throw new Error("applyMatch: team rosters must be four distinct players");
  }
  const isAWin = match.scoreA > match.scoreB;
  const sA = isAWin ? 1 : 0;
  const sB = 1 - sA;

  const rA = (states[a1].rating + states[a2].rating) / 2;
  const rB = (states[b1].rating + states[b2].rating) / 2;
  const eA = expectedScore(rA, rB);
  const eB = 1 - eA;

  const mm = marginMultiplier(match.scoreA, match.scoreB);
  const kA = ((baseK(states[a1].games_played) + baseK(states[a2].games_played)) / 2) * mm;
  const kB = ((baseK(states[b1].games_played) + baseK(states[b2].games_played)) / 2) * mm;

  const deltaA = kA * (sA - eA);
  const deltaB = kB * (sB - eB);

  const updated: Record<string, PlayerState> = { ...states };
  const history: HistoryRow[] = [];

  const apply = (id: string, delta: number, won: boolean) => {
    const cur = states[id];
    const before = cur.rating;
    const after = round1(before + delta);
    updated[id] = {
      ...cur,
      rating: after,
      games_played: cur.games_played + 1,
      wins: cur.wins + (won ? 1 : 0),
      losses: cur.losses + (won ? 0 : 1),
    };
    history.push({
      player_id: id,
      rating_before: before,
      rating_after: after,
      delta: round2(delta),
    });
  };

  apply(a1, deltaA, isAWin);
  apply(a2, deltaA, isAWin);
  apply(b1, deltaB, !isAWin);
  apply(b2, deltaB, !isAWin);

  return { updated, deltaA, deltaB, expectedA: eA, history };
}

// Rebuild final player states and per-match history by replaying every match
// in chronological order starting from the starting rating. Callers pass the
// set of player IDs that should appear in the output (so players who never
// played still land at 1200).
export function rebuildFromZero(
  playerIds: string[],
  matches: MatchInput[],
): {
  finalStates: Record<string, PlayerState>;
  perMatch: Array<{ match: MatchInput; history: HistoryRow[]; deltaA: number; deltaB: number }>;
} {
  let states: Record<string, PlayerState> = {};
  for (const id of playerIds) states[id] = newPlayer(id);
  const perMatch: Array<{ match: MatchInput; history: HistoryRow[]; deltaA: number; deltaB: number }> = [];
  for (const m of matches) {
    const res = applyMatch(states, m);
    states = res.updated;
    perMatch.push({ match: m, history: res.history, deltaA: res.deltaA, deltaB: res.deltaB });
  }
  return { finalStates: states, perMatch };
}
