export type Player = {
  id: string;
  name: string;
  rating: number;
  games_played: number;
  wins: number;
  losses: number;
  active: boolean;
  created_at: string;
};

export type Match = {
  id: string;
  team_a_p1: string;
  team_a_p2: string;
  team_b_p1: string;
  team_b_p2: string;
  score_a: number;
  score_b: number;
  played_at: string;
  created_at: string;
};

export type RatingHistoryRow = {
  id: string;
  player_id: string;
  match_id: string;
  rating_before: number;
  rating_after: number;
  delta: number;
  created_at: string;
};
