import logger from "@/utils/logger";

/**
 * Service to track socket connections per user in rooms
 * Enables finding and disconnecting existing sockets when users reconnect
 */
class SocketTrackingService {
  // Map: roomCode -> userId -> socketId
  private userSocketMap: Map<string, Map<string, string>> = new Map();

  /**
   * Register a user's socket connection in a room
   */
  registerUserSocket(roomCode: string, userId: string, socketId: string): void {
    if (!this.userSocketMap.has(roomCode)) {
      this.userSocketMap.set(roomCode, new Map());
    }

    const roomMap = this.userSocketMap.get(roomCode)!;
    const existingSocketId = roomMap.get(userId);

    if (existingSocketId && existingSocketId !== socketId) {
      logger.forceInfo("Replacing existing socket for user", {
        roomCode,
        userId,
        oldSocketId: existingSocketId,
        newSocketId: socketId,
      });
    }

    roomMap.set(userId, socketId);

    logger.info("User socket registered", {
      roomCode,
      userId,
      socketId,
      totalUsersInRoom: roomMap.size,
    });
  }

  /**
   * Get the socket ID for a user in a room
   */
  getUserSocket(roomCode: string, userId: string): string | null {
    const roomMap = this.userSocketMap.get(roomCode);
    if (!roomMap) return null;

    return roomMap.get(userId) || null;
  }

  /**
   * Remove a user's socket registration from a room
   */
  removeUserSocket(roomCode: string, userId: string): void {
    const roomMap = this.userSocketMap.get(roomCode);
    if (!roomMap) return;

    const removed = roomMap.delete(userId);

    if (removed) {
      logger.info("User socket removed", {
        roomCode,
        userId,
        remainingUsersInRoom: roomMap.size,
      });

      // Clean up empty room maps
      if (roomMap.size === 0) {
        this.userSocketMap.delete(roomCode);
        logger.info("Empty room map cleaned up", { roomCode });
      }
    }
  }

  /**
   * Remove a socket from all room mappings (cleanup on disconnect)
   */
  removeSocketFromAllRooms(socketId: string): void {
    let cleanupCount = 0;

    for (const [roomCode, roomMap] of this.userSocketMap.entries()) {
      for (const [userId, userSocketId] of roomMap.entries()) {
        if (userSocketId === socketId) {
          roomMap.delete(userId);
          cleanupCount++;

          logger.info("Socket cleaned up from room", {
            roomCode,
            userId,
            socketId,
          });

          // Clean up empty room maps
          if (roomMap.size === 0) {
            this.userSocketMap.delete(roomCode);
            logger.info("Empty room map cleaned up after socket removal", {
              roomCode,
            });
          }
          break;
        }
      }
    }

    if (cleanupCount > 0) {
      logger.info("Socket cleanup completed", {
        socketId,
        roomsCleanedUp: cleanupCount,
      });
    }
  }

  /**
   * Check if a user has an active socket in a room
   */
  hasUserSocket(roomCode: string, userId: string): boolean {
    const socketId = this.getUserSocket(roomCode, userId);
    return socketId !== null;
  }

  /**
   * Get all users in a room (for debugging)
   */
  getRoomUsers(roomCode: string): string[] {
    const roomMap = this.userSocketMap.get(roomCode);
    if (!roomMap) return [];

    return Array.from(roomMap.keys());
  }

  /**
   * Get debug info about current state
   */
  getDebugInfo(): any {
    const roomInfo: any = {};

    for (const [roomCode, roomMap] of this.userSocketMap.entries()) {
      roomInfo[roomCode] = {
        userCount: roomMap.size,
        users: Array.from(roomMap.entries()).map(([userId, socketId]) => ({
          userId,
          socketId,
        })),
      };
    }

    return {
      totalRooms: this.userSocketMap.size,
      rooms: roomInfo,
    };
  }

  /**
   * Force disconnect an existing socket connection
   * Returns true if socket was found and disconnected
   */
  disconnectExistingUserSocket(
    io: any,
    roomCode: string,
    userId: string,
  ): boolean {
    const existingSocketId = this.getUserSocket(roomCode, userId);
    if (!existingSocketId) {
      return false;
    }

    // Find the socket instance
    const existingSocket = io.sockets.sockets.get(existingSocketId);
    if (!existingSocket) {
      logger.forceWarn("Existing socket not found in io.sockets", {
        roomCode,
        userId,
        socketId: existingSocketId,
      });
      // Clean up stale mapping
      this.removeUserSocket(roomCode, userId);
      return false;
    }

    logger.forceInfo("Force disconnecting existing user socket", {
      roomCode,
      userId,
      existingSocketId,
    });

    // Ensure socket leaves the room before disconnection
    try {
      existingSocket.leave(roomCode);
      logger.info("Socket left room before forced disconnection", {
        roomCode,
        userId,
        socketId: existingSocketId,
      });
    } catch (error) {
      logger.warn("Failed to make socket leave room before disconnection", {
        roomCode,
        userId,
        socketId: existingSocketId,
        error: (error as Error).message,
      });
    }

    // Force disconnect the existing socket
    existingSocket.disconnect(true);

    // The disconnect handler will clean up the user from the room
    // and remove the socket from our tracking

    return true;
  }
}

export default new SocketTrackingService();
