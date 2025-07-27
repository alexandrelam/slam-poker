import { SocketType } from "@/types/socket.types";
import roomService from "@/services/roomService";
import logger from "@/utils/logger";
import correlationService from "@/utils/correlationService";
import { SocketErrorHandler } from "@/utils/socketErrors";
import {
  requireAuthentication,
  withErrorLogging,
} from "@/middleware/socketMiddleware";

export const handleEmojiSpawn = withErrorLogging(
  "emoji-spawn",
  (socket: SocketType, io: any, data: { emoji: string }) => {
    const correlationId = correlationService.getSocketCorrelationId(socket);
    const timing = logger.startTiming("cast_vote");

    logger.logUserAction("Emoji spawn handler started", "cast_vote", {
      socketId: socket.id,
      emoji: data.emoji,
      correlation_id: correlationId,
    });

    // Check authentication
    const authResult = requireAuthentication(socket);
    if (!authResult.continue) {
      logger.forceWarn("Emoji spawn handler: authentication FAILED", {
        socketId: socket.id,
        socketData: socket.data,
        hasUserId: !!socket.data.userId,
        hasRoomCode: !!socket.data.roomCode,
      });
      return;
    }

    const { userId, roomCode } = socket.data;
    const { emoji } = data;

    logger.forceInfo("Emoji spawn handler: authentication PASSED", {
      socketId: socket.id,
      userId,
      roomCode,
      userName: socket.data.userName,
      emoji: emoji,
    });

    // Validate emoji (basic check that it's a string and not empty)
    if (!emoji || typeof emoji !== "string" || emoji.trim().length === 0) {
      logger.forceWarn("Emoji spawn handler: invalid emoji", {
        socketId: socket.id,
        emoji: emoji,
        emojiType: typeof emoji,
      });
      socket.emit("error", { message: "Invalid emoji" });
      return;
    }

    // Check if room exists
    const room = roomService.findRoom(roomCode!);
    if (!room) {
      logger.forceWarn("Emoji spawn handler: room not found", {
        socketId: socket.id,
        roomCode,
        userId,
      });
      SocketErrorHandler.emitRoomNotFound(socket);
      return;
    }

    // Check if user exists in room and is online
    const user = room.users.find((u) => u.id === userId);
    if (!user || !user.isOnline) {
      logger.forceWarn("Emoji spawn handler: user not found or offline", {
        socketId: socket.id,
        roomCode,
        userId,
        userExists: !!user,
        userIsOnline: user?.isOnline,
      });
      SocketErrorHandler.emitRoomNotFound(socket);
      return;
    }

    // Generate random X coordinate (0-100% of screen width, client will convert to pixels)
    // Y coordinate is always 0 (top of screen)
    const x = Math.random() * 100; // 0-100% of screen width
    const y = 0; // Always spawn at the top

    // Broadcast emoji spawn to all users in the room
    io.to(roomCode).emit("emoji-spawned", {
      emoji: emoji.trim(),
      x: x,
      y: y,
      userId: userId,
    });

    // Log completion with timing
    logger.endTiming(timing, "Emoji spawn handler completed successfully", {
      socketId: socket.id,
      userId,
      roomCode,
      emoji: emoji,
      x: x,
      y: y,
      room_size: room.users.length,
      correlation_id: correlationId,
    });
  },
);
