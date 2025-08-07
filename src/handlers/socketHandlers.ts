import { SocketType } from "@/types/socket.types";
import logger from "@/utils/logger";
import correlationService from "@/utils/correlationService";
import metricsService from "@/services/metricsService";

// Import modular handlers
import { handleJoinRoom, handleUpdateRoomSettings } from "./roomHandlers";
import {
  handleVote,
  handleRevealVotes,
  handleNextRound,
} from "./votingHandlers";
import {
  handleKickUser,
  handleChangeName,
  handleDisconnect,
} from "./userHandlers";
import { handleEmojiSpawn } from "./emojiHandlers";
import { handleStartTimer, handleResetTimer } from "./timerHandlers";

// Helper function to wrap event handlers with metrics tracking
const withMetrics = (eventType: string, handler: Function) => {
  return (...args: any[]) => {
    const startTime = Date.now();
    try {
      const result = handler(...args);
      const duration = (Date.now() - startTime) / 1000;
      metricsService.observeWebsocketEventDuration(eventType, duration);
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      metricsService.observeWebsocketEventDuration(eventType, duration);
      throw error;
    }
  };
};

export const handleSocketConnection = (socket: SocketType, io: any) => {
  // Initialize correlation ID for this socket connection
  const correlationId = correlationService.setSocketCorrelationId(socket);

  // Log WebSocket connection with enhanced metadata
  logger.logSystemEvent(
    "WebSocket connection established",
    "websocket_connect",
    {
      socketId: socket.id,
      correlation_id: correlationId,
      client_ip: socket.handshake.address,
      user_agent: socket.handshake.headers["user-agent"],
      connection_time: new Date().toISOString(),
    },
  );

  // Room-related events
  socket.on("join-room", withMetrics("join-room", (data: any) => handleJoinRoom(socket, io, data)));
  socket.on("update-room-settings", withMetrics("update-room-settings", (data: any) =>
    handleUpdateRoomSettings(socket, io, data)
  ));

  // Voting-related events
  socket.on("vote", withMetrics("vote", (data: any) => handleVote(socket, io, data)));
  socket.on("reveal-votes", withMetrics("reveal-votes", () => handleRevealVotes(socket, io)));
  socket.on("next-round", withMetrics("next-round", () => handleNextRound(socket, io)));

  // Timer-related events
  socket.on("start-timer", withMetrics("start-timer", () => handleStartTimer(socket, io)));
  socket.on("reset-timer", withMetrics("reset-timer", () => handleResetTimer(socket, io)));

  // User management events
  socket.on("kick-user", withMetrics("kick-user", (data: any) => handleKickUser(socket, io, data)));
  socket.on("change-name", withMetrics("change-name", (data: any) => handleChangeName(socket, io, data)));

  // Emoji events
  socket.on("emoji-spawn", withMetrics("emoji-spawn", (data: any) => handleEmojiSpawn(socket, io, data)));

  // Enhanced disconnect handler
  socket.on("disconnect", (reason) => {
    // Log disconnection with session info
    logger.logSystemEvent(
      "WebSocket connection closed",
      "websocket_disconnect",
      {
        socketId: socket.id,
        disconnect_reason: reason,
        userId: socket.data.userId,
        roomCode: socket.data.roomCode,
        correlation_id: correlationService.getSocketCorrelationId(socket),
        session_duration_ms: socket.handshake.time
          ? Date.now() - new Date(socket.handshake.time).getTime()
          : 0,
      },
    );

    // Clean up correlation tracking
    correlationService.removeSocketCorrelation(socket.id);

    // Call the original disconnect handler
    handleDisconnect(socket, io, reason);
  });
};
