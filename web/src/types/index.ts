// Re-export backend types
export type {
  User,
  Room,
  FibonacciCard,
  RevealPermission,
  KickPermission,
} from "../../../src/types/room.types";
export type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../../src/types/socket.types";

// Frontend-specific enums
export const AppScreen = {
  LANDING: "landing",
  ROOM: "room",
} as const;

export const ConnectionStatus = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
} as const;

export type AppScreen = (typeof AppScreen)[keyof typeof AppScreen];
export type ConnectionStatus =
  (typeof ConnectionStatus)[keyof typeof ConnectionStatus];

// Import types separately
import type { User, Room } from "../../../src/types/room.types";

// Frontend state interfaces
export interface AppState {
  currentScreen: AppScreen;
  currentUser: User | null;
  currentRoom: Room | null;
  connectionStatus: ConnectionStatus;
  error: string | null;
  isLoading: boolean;
  isChangingName: boolean;
}

export interface JoinRoomForm {
  roomCode: string;
  userName: string;
}

export interface CreateRoomForm {
  userName: string;
}

// UI State for voting
export interface VotingState {
  hasVoted: boolean;
  canReveal: boolean; // true if user is facilitator or all have voted
  isRevealing: boolean;
}

// Extended user interface with UI state
export interface UIUser extends User {
  hasVoted: boolean;
}

// Room state with additional UI properties
export interface UIRoom extends Room {
  users: UIUser[];
  allVoted: boolean;
  allOnlineVoted: boolean; // true if all currently online users have voted
  facilitatorId?: string; // first user to join is facilitator
}
