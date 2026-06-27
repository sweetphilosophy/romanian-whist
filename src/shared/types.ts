export type Suit = "C" | "D" | "H" | "S";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export type Card = {
  id: string;
  rank: Rank;
  suit: Suit;
};

export type PublicPlayer = {
  clientId: string;
  name: string;
  connected: boolean;
  host: boolean;
  score: number;
  bid: number | null;
  tricks: number;
  handCount: number;
  positiveStreak: number;
  negativeStreak: number;
};

export type PublicGameState = {
  code: string;
  phase: "lobby" | "bidding" | "playing" | "roundEnd" | "gameEnd";
  meId: string;
  hostId: string | null;
  roundIndex: number;
  totalRounds: number;
  handSize: number;
  trump: Card | null;
  dealerId: string | null;
  currentTurnId: string | null;
  biddingOrder: string[];
  currentTrick: Array<{ playerId: string; card: Card }>;
  lastCompletedTrick: {
    id: number;
    plays: Array<{ playerId: string; card: Card }>;
    winnerId: string;
  } | null;
  history: Array<{
    round: number;
    handSize: number;
    trump: Card | null;
    scores: Array<{
      clientId: string;
      name: string;
      bid: number;
      tricks: number;
      baseDelta: number;
      streakBonus: number;
      delta: number;
      total: number;
      positiveStreak: number;
      negativeStreak: number;
    }>;
  }>;
  players: PublicPlayer[];
  hand: Card[];
  legalCardIds: string[];
  allowedBids: number[];
};
