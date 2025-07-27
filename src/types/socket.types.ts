import type { Socket } from "socket.io";
import type {
  User,
  Room,
  FibonacciCard,
  RevealPermission,
  KickPermission,
} from "./room.types";

export interface ClientToServerEvents {
  "join-room": (data: {
    roomCode: string;
    userName: string;
    userId: string;
  }) => void;
  vote: (data: { vote: FibonacciCard }) => void;
  "reveal-votes": () => void;
  "next-round": () => void;
  "update-room-settings": (data: {
    revealPermission?: RevealPermission;
    kickPermission?: KickPermission;
  }) => void;
  "change-name": (data: { newName: string }) => void;
  "kick-user": (data: { userIdToKick: string }) => void;
  "emoji-spawn": (data: { emoji: string }) => void;
}

export interface ServerToClientEvents {
  "room-state": (data: {
    room: Room;
    timestamp: number;
    reason: string;
  }) => void;
  "user-joined": (data: { user: User; room: Room }) => void;
  "user-left": (data: { userId: string; room: Room }) => void;
  "user-kicked": (data: {
    userId: string;
    userName: string;
    room: Room;
  }) => void;
  "vote-cast": (data: {
    userId: string;
    hasVoted: boolean;
    room: Room;
  }) => void;
  "votes-revealed": (data: { room: Room }) => void;
  "round-reset": (data: { room: Room }) => void;
  "room-settings-updated": (data: { room: Room }) => void;
  "name-changed": (data: {
    userId: string;
    newName: string;
    room: Room;
  }) => void;
  error: (data: { message: string }) => void;
  "room-not-found": () => void;
  "invalid-vote": () => void;
  "emoji-spawned": (data: {
    emoji: string;
    x: number;
    y: number;
    userId: string;
  }) => void;
}

export interface InterServerEvents {
  // For potential scaling to multiple servers
}

export interface SocketData {
  userId?: string;
  roomCode?: string;
  userName?: string;
  correlationId?: string;
}

export type SocketType = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
