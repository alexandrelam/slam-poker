export interface User {
  id: string;
  name: string;
  currentVote?: string;
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
}

export const FIBONACCI_CARDS = [
  "0",
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
