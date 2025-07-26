import type { User, Room, FibonacciCard, RevealPermission } from "./room.types";

export interface ClientToServerEvents {
  "join-room": (data: { roomCode: string; userName: string }) => void;
  vote: (data: { vote: FibonacciCard }) => void;
  "reveal-votes": () => void;
  "next-round": () => void;
  "update-room-settings": (data: {
    revealPermission: RevealPermission;
  }) => void;
  "change-name": (data: { newName: string }) => void;
}

export interface ServerToClientEvents {
  "user-joined": (data: { user: User; room: Room }) => void;
  "user-left": (data: { userId: string; room: Room }) => void;
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
}

export interface InterServerEvents {
  // For potential scaling to multiple servers
}

export interface SocketData {
  userId?: string;
  roomCode?: string;
  userName?: string;
}
