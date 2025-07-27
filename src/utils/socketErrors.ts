import { Socket } from "socket.io";
import { SocketType } from "@/types/socket.types";
import logger, { ErrorCategory } from "@/utils/logger";
import correlationService from "@/utils/correlationService";
import errorTrackingService from "@/services/errorTrackingService";

// Error message constants
export const ERROR_MESSAGES = {
  ROOM_CODE_AND_USER_NAME_REQUIRED: "Room code and user name are required",
  INVALID_USER_NAME: "Invalid user name. Must be 1-50 characters.",
  FAILED_TO_JOIN_ROOM: "Failed to join room",
  NOT_JOINED_TO_ROOM: "Not joined to any room",
  NO_PERMISSION_REVEAL_VOTES: "You don't have permission to reveal votes",
  NO_PERMISSION_NEXT_ROUND: "You don't have permission to start the next round",
  NO_PERMISSION_UPDATE_SETTINGS: "Only the host can update room settings",
  NO_PERMISSION_KICK_USERS: "You don't have permission to kick users",
  NO_PERMISSION_TIMER: "You don't have permission to control the timer",
  FAILED_TO_REVEAL_VOTES: "Failed to reveal votes",
  FAILED_TO_START_NEXT_ROUND: "Failed to start next round",
  FAILED_TO_UPDATE_SETTINGS: "Failed to update room settings",
  FAILED_TO_KICK_USER: "Failed to kick user",
  FAILED_TO_CAST_VOTE: "Failed to cast vote",
  FAILED_TO_CHANGE_NAME: "Failed to change name",
  FAILED_TO_START_TIMER: "Failed to start timer",
  FAILED_TO_RESET_TIMER: "Failed to reset timer",
  USER_ID_TO_KICK_REQUIRED: "User ID to kick is required",
  INVALID_NAME_PROVIDED: "Invalid name provided",
  USER_NOT_FOUND_IN_ROOM: "User not found in room",
  DUPLICATE_USER_IN_ROOM:
    "You are already in this room. Please close other tabs or windows.",
  FAILED_TO_CREATE_USER: "Failed to create user",
  USER_ID_MISMATCH: "User ID mismatch",
  FAILED_TO_ADD_USER_TO_ROOM: "Failed to add user to room",
  ROOM_NO_LONGER_EXISTS: "Room no longer exists",
} as const;

// Socket error response utilities with enhanced logging
export class SocketErrorHandler {
  static emitError(
    socket: SocketType,
    message: string,
    category: ErrorCategory = "system_error",
    additionalContext: Record<string, any> = {},
  ): void {
    const correlationId = correlationService.getSocketCorrelationId(socket);

    // Track error for business metrics
    errorTrackingService.recordError(
      category,
      "websocket_connect", // Default operation type
      socket.data.userId,
      socket.data.roomCode,
      {
        socketId: socket.id,
        client_message: message,
        correlation_id: correlationId,
        ...additionalContext,
      },
    );

    // Log the error with category for Grafana alerting
    logger.logError(`Socket error: ${message}`, null, category, {
      socketId: socket.id,
      userId: socket.data.userId,
      roomCode: socket.data.roomCode,
      correlation_id: correlationId,
      client_message: message,
      ...additionalContext,
    });

    socket.emit("error", { message });
  }

  static emitRoomNotFound(socket: SocketType): void {
    const correlationId = correlationService.getSocketCorrelationId(socket);

    logger.logError("Room not found error", null, "not_found_error", {
      socketId: socket.id,
      userId: socket.data.userId,
      roomCode: socket.data.roomCode,
      correlation_id: correlationId,
    });

    socket.emit("room-not-found");
  }

  static emitInvalidVote(socket: SocketType): void {
    const correlationId = correlationService.getSocketCorrelationId(socket);

    logger.logError("Invalid vote submitted", null, "validation_error", {
      socketId: socket.id,
      userId: socket.data.userId,
      roomCode: socket.data.roomCode,
      correlation_id: correlationId,
    });

    socket.emit("invalid-vote");
  }

  // Common error responses with categorized logging
  static emitAuthenticationError(socket: SocketType): void {
    this.emitError(
      socket,
      ERROR_MESSAGES.NOT_JOINED_TO_ROOM,
      "authentication_error",
      { reason: "user_not_in_room" },
    );
  }

  static emitPermissionError(
    socket: SocketType,
    action:
      | "reveal"
      | "nextRound"
      | "settings"
      | "kick"
      | "startTimer"
      | "resetTimer",
  ): void {
    const messageMap = {
      reveal: ERROR_MESSAGES.NO_PERMISSION_REVEAL_VOTES,
      nextRound: ERROR_MESSAGES.NO_PERMISSION_NEXT_ROUND,
      settings: ERROR_MESSAGES.NO_PERMISSION_UPDATE_SETTINGS,
      kick: ERROR_MESSAGES.NO_PERMISSION_KICK_USERS,
      startTimer: ERROR_MESSAGES.NO_PERMISSION_TIMER,
      resetTimer: ERROR_MESSAGES.NO_PERMISSION_TIMER,
    };

    this.emitError(socket, messageMap[action], "permission_error", {
      action,
      user_role: socket.data.userId ? "participant" : "unknown",
    });
  }

  static emitValidationError(
    socket: SocketType,
    field: "userInfo" | "userName" | "name" | "userIdToKick",
  ): void {
    const messageMap = {
      userInfo: ERROR_MESSAGES.ROOM_CODE_AND_USER_NAME_REQUIRED,
      userName: ERROR_MESSAGES.INVALID_USER_NAME,
      name: ERROR_MESSAGES.INVALID_NAME_PROVIDED,
      userIdToKick: ERROR_MESSAGES.USER_ID_TO_KICK_REQUIRED,
    };

    this.emitError(socket, messageMap[field], "validation_error", {
      validation_field: field,
    });
  }

  static emitOperationError(
    socket: SocketType,
    operation:
      | "join"
      | "vote"
      | "reveal"
      | "nextRound"
      | "settings"
      | "kick"
      | "changeName"
      | "startTimer"
      | "resetTimer",
  ): void {
    const messageMap = {
      join: ERROR_MESSAGES.FAILED_TO_JOIN_ROOM,
      vote: ERROR_MESSAGES.FAILED_TO_CAST_VOTE,
      reveal: ERROR_MESSAGES.FAILED_TO_REVEAL_VOTES,
      nextRound: ERROR_MESSAGES.FAILED_TO_START_NEXT_ROUND,
      settings: ERROR_MESSAGES.FAILED_TO_UPDATE_SETTINGS,
      kick: ERROR_MESSAGES.FAILED_TO_KICK_USER,
      changeName: ERROR_MESSAGES.FAILED_TO_CHANGE_NAME,
      startTimer: ERROR_MESSAGES.FAILED_TO_START_TIMER,
      resetTimer: ERROR_MESSAGES.FAILED_TO_RESET_TIMER,
    };

    this.emitError(socket, messageMap[operation], "system_error", {
      failed_operation: operation,
    });
  }

  // New method for rate limiting errors
  static emitRateLimitError(socket: SocketType, operation: string): void {
    this.emitError(
      socket,
      `Rate limit exceeded for ${operation}`,
      "rate_limit_error",
      { limited_operation: operation },
    );
  }

  // New method for network-related errors
  static emitNetworkError(socket: SocketType, details: string): void {
    this.emitError(socket, `Network error: ${details}`, "network_error", {
      network_details: details,
    });
  }
}
