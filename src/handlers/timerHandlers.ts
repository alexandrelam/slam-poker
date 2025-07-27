import { SocketType } from "@/types/socket.types";
import roomService from "@/services/roomService";
import permissionService from "@/services/permissionService";
import sessionTrackingService from "@/services/sessionTrackingService";
import logger from "@/utils/logger";
import correlationService from "@/utils/correlationService";
import { SocketErrorHandler } from "@/utils/socketErrors";
import { RoomStateBroadcaster } from "@/utils/roomStateBroadcast";
import {
  requireAuthentication,
  requirePermission,
  withErrorLogging,
} from "@/middleware/socketMiddleware";

// Start timer handler
export const handleStartTimer = withErrorLogging(
  "start-timer",
  (socket: SocketType, io: any) => {
    const correlationId = correlationService.getSocketCorrelationId(socket);
    const timing = logger.startTiming("start_timer");

    logger.logUserAction("Start timer handler started", "start_timer", {
      socketId: socket.id,
      correlation_id: correlationId,
    });

    // Check authentication
    const authResult = requireAuthentication(socket);
    if (!authResult.continue) {
      logger.forceWarn("Start timer handler: authentication FAILED", {
        socketId: socket.id,
        socketData: socket.data,
      });
      return;
    }

    const { userId, roomCode } = socket.data;

    logger.forceInfo("Start timer handler: authentication PASSED", {
      socketId: socket.id,
      userId,
      roomCode,
      userName: socket.data.userName,
    });

    // Check permission to start timer (same as reveal votes permission)
    if (
      !requirePermission(
        socket,
        permissionService.canRevealVotes.bind(permissionService),
        "startTimer",
      ).continue
    )
      return;

    const updatedRoom = roomService.startTimer(roomCode!);
    if (!updatedRoom) {
      logger.forceWarn("Start timer handler: startTimer FAILED", {
        socketId: socket.id,
        roomCode,
        userId,
      });
      SocketErrorHandler.emitRoomNotFound(socket);
      return;
    }

    // Broadcast timer started to all users
    RoomStateBroadcaster.broadcastStateChange(
      io,
      roomCode!,
      updatedRoom,
      "timer-started",
    );

    // Also send timer-specific event
    io.to(roomCode).emit("timer-started", {
      room: updatedRoom,
      startedAt: updatedRoom.timerStartedAt!,
    });

    // Update session tracking
    sessionTrackingService.updateActivity(userId!, "timer");

    // Log completion with timing
    logger.endTiming(timing, "Start timer handler completed successfully", {
      socketId: socket.id,
      userId,
      roomCode,
      correlation_id: correlationId,
    });
  },
);

// Reset timer handler
export const handleResetTimer = withErrorLogging(
  "reset-timer",
  (socket: SocketType, io: any) => {
    const correlationId = correlationService.getSocketCorrelationId(socket);
    const timing = logger.startTiming("reset_timer");

    logger.logUserAction("Reset timer handler started", "reset_timer", {
      socketId: socket.id,
      correlation_id: correlationId,
    });

    // Check authentication
    if (!requireAuthentication(socket).continue) return;

    const { userId, roomCode } = socket.data;

    // Check permission to reset timer (same as reveal votes permission)
    if (
      !requirePermission(
        socket,
        permissionService.canRevealVotes.bind(permissionService),
        "resetTimer",
      ).continue
    )
      return;

    const updatedRoom = roomService.resetTimer(roomCode!);
    if (!updatedRoom) {
      logger.forceWarn("Reset timer handler: resetTimer FAILED", {
        socketId: socket.id,
        roomCode,
        userId,
      });
      SocketErrorHandler.emitRoomNotFound(socket);
      return;
    }

    // Broadcast timer reset to all users
    RoomStateBroadcaster.broadcastStateChange(
      io,
      roomCode!,
      updatedRoom,
      "timer-reset",
    );

    // Also send timer-specific event
    io.to(roomCode).emit("timer-reset", { room: updatedRoom });

    // Update session tracking
    sessionTrackingService.updateActivity(userId!, "timer");

    // Log completion with timing
    logger.endTiming(timing, "Reset timer handler completed successfully", {
      socketId: socket.id,
      userId,
      roomCode,
      correlation_id: correlationId,
    });
  },
);
