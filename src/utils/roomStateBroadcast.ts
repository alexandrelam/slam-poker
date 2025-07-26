import { Room } from "@/types/room.types";
import { SocketType } from "@/types/socket.types";
import logger from "@/utils/logger";

export interface RoomStateBroadcastOptions {
  room: Room;
  reason: string;
  excludeSocketId?: string;
}

export class RoomStateBroadcaster {
  /**
   * Broadcast complete room state to all users in a room
   */
  static broadcastToRoom(
    io: any,
    roomCode: string,
    options: RoomStateBroadcastOptions,
  ): void {
    const timestamp = Date.now();
    const eventData = {
      room: options.room,
      timestamp,
      reason: options.reason,
    };

    logger.forceInfo("=== BROADCASTING ROOM STATE ===", {
      roomCode,
      reason: options.reason,
      timestamp,
      roomUserCount: options.room.users.length,
      roomUsers: options.room.users.map((u) => ({
        id: u.id,
        name: u.name,
        isOnline: u.isOnline,
        hasVoted: !!u.currentVote,
      })),
      votingInProgress: options.room.votingInProgress,
      votesRevealed: options.room.votesRevealed,
      excludeSocketId: options.excludeSocketId || null,
    });

    if (options.excludeSocketId) {
      // Broadcast to all users in room except the excluded socket
      io.to(roomCode)
        .except(options.excludeSocketId)
        .emit("room-state", eventData);
      logger.forceInfo("Room state broadcasted to room (excluding socket)", {
        roomCode,
        excludedSocketId: options.excludeSocketId,
        reason: options.reason,
      });
    } else {
      // Broadcast to all users in room
      io.to(roomCode).emit("room-state", eventData);
      logger.forceInfo("Room state broadcasted to entire room", {
        roomCode,
        reason: options.reason,
      });
    }
  }

  /**
   * Send complete room state to a specific socket
   */
  static sendToSocket(
    socket: SocketType,
    options: RoomStateBroadcastOptions,
  ): void {
    const timestamp = Date.now();
    const eventData = {
      room: options.room,
      timestamp,
      reason: options.reason,
    };

    logger.forceInfo("=== SENDING ROOM STATE TO SOCKET ===", {
      socketId: socket.id,
      reason: options.reason,
      timestamp,
      roomCode: options.room.code,
      roomUserCount: options.room.users.length,
      roomUsers: options.room.users.map((u) => ({
        id: u.id,
        name: u.name,
        isOnline: u.isOnline,
        hasVoted: !!u.currentVote,
      })),
      votingInProgress: options.room.votingInProgress,
      votesRevealed: options.room.votesRevealed,
    });

    socket.emit("room-state", eventData);

    logger.forceInfo("Room state sent to socket successfully", {
      socketId: socket.id,
      roomCode: options.room.code,
      reason: options.reason,
    });
  }

  /**
   * Broadcast room state change to all users with comprehensive logging
   */
  static broadcastStateChange(
    io: any,
    roomCode: string,
    room: Room,
    changeType: string,
    changeDetails?: any,
  ): void {
    this.broadcastToRoom(io, roomCode, {
      room,
      reason: `state-change:${changeType}`,
    });

    logger.forceInfo("Room state change broadcasted", {
      roomCode,
      changeType,
      changeDetails: changeDetails || {},
      totalUsers: room.users.length,
      onlineUsers: room.users.filter((u) => u.isOnline).length,
      usersWithVotes: room.users.filter((u) => u.currentVote).length,
    });
  }

  /**
   * Send initial room state to newly joined user
   */
  static sendInitialState(
    socket: SocketType,
    room: Room,
    isReconnection: boolean = false,
  ): void {
    const reason = isReconnection ? "reconnection-sync" : "initial-join";

    this.sendToSocket(socket, {
      room,
      reason,
    });

    logger.forceInfo("Initial room state sent to user", {
      socketId: socket.id,
      roomCode: room.code,
      isReconnection,
      userCount: room.users.length,
    });
  }
}
