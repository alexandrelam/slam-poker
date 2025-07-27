export const FIBONACCI_CARDS = [
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "21",
  "34",
  "55",
  "89",
  "?",
] as const;

export type FibonacciCard = (typeof FIBONACCI_CARDS)[number];

export interface User {
  id: string;
  name: string;
  currentVote?: FibonacciCard;
  isOnline: boolean;
}

export type RevealPermission = "host-only" | "everyone";
export type KickPermission = "host-only" | "everyone";

export interface Room {
  code: string;
  users: User[];
  votingInProgress: boolean;
  votesRevealed: boolean;
  createdAt: Date;
  revealPermission: RevealPermission;
  kickPermission: KickPermission;
  voteStatistics?: VoteStatistics; // computed when votes are revealed
  // Timer state
  timerStartedAt: Date | null;
  timerRunning: boolean;
}

export interface VoteDistribution {
  value: FibonacciCard;
  count: number;
  users: string[]; // user names who voted for this value
  percentage: number;
}

export interface VoteStatistics {
  average: number | null; // null if no numeric votes or only "?" votes
  median: number | null; // null if no numeric votes or only "?" votes
  distribution: VoteDistribution[];
  totalVotes: number;
}
