import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  FibonacciCard,
  RevealPermission,
  KickPermission,
} from "../types";
import { ConnectionStatus } from "../types";
import { getOrCreateUserId } from "../lib/userStorage";

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null =
    null;
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private listeners: { [event: string]: (...args: any[]) => void } = {};

  // Initialize connection
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.connectionStatus = ConnectionStatus.CONNECTING;

      // Get websocket URL from environment or use current origin
      const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;

      this.socket = io(wsUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on("connect", () => {
        this.connectionStatus = ConnectionStatus.CONNECTED;
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        this.connectionStatus = ConnectionStatus.ERROR;
        reject(error);
      });

      this.socket.on("disconnect", () => {
        this.connectionStatus = ConnectionStatus.DISCONNECTED;
      });
    });
  }

  // Disconnect from server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus = ConnectionStatus.DISCONNECTED;
    }
  }

  // Get current connection status
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Event emission methods
  joinRoom(roomCode: string, userName: string) {
    if (!this.socket) throw new Error("Socket not connected");

    // Get or create persistent user ID
    const userId = getOrCreateUserId();

    console.log("Joining room with persistent user ID:", {
      roomCode,
      userName,
      userId,
    });

    this.socket.emit("join-room", { roomCode, userName, userId });
  }

  vote(vote: FibonacciCard) {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("vote", { vote });
  }

  revealVotes() {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("reveal-votes");
  }

  nextRound() {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("next-round");
  }

  startTimer(duration?: number) {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("start-timer", { duration });
  }

  resetTimer() {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("reset-timer");
  }

  updateRoomSettings(settings: {
    revealPermission?: RevealPermission;
    kickPermission?: KickPermission;
  }) {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("update-room-settings", settings);
  }

  changeName(newName: string) {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("change-name", { newName });
  }

  kickUser(userIdToKick: string) {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("kick-user", { userIdToKick });
  }

  spawnEmoji(emoji: string) {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("emoji-spawn", { emoji });
  }

  // Event listener management
  on<T extends keyof ServerToClientEvents>(
    event: T,
    callback: ServerToClientEvents[T],
  ) {
    if (!this.socket) throw new Error("Socket not connected");

    // Remove existing listener if any
    if (this.listeners[event]) {
      this.socket.off(event as any, this.listeners[event] as any);
    }

    // Add new listener
    this.listeners[event] = callback as any;
    this.socket.on(event as any, callback as any);
  }

  // Remove event listener
  off(event: keyof ServerToClientEvents) {
    if (this.socket && this.listeners[event]) {
      this.socket.off(event as any, this.listeners[event] as any);
      delete this.listeners[event];
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      Object.keys(this.listeners).forEach((event) => {
        this.socket!.off(event as any, this.listeners[event] as any);
      });
      this.listeners = {};
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
