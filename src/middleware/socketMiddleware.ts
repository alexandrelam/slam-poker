import { SocketType } from "@/types/socket.types";
import { SocketErrorHandler } from "@/utils/socketErrors";
import userService from "@/services/userService";
import roomService from "@/services/roomService";
import { FIBONACCI_CARDS, FibonacciCard } from "@/types/room.types";
import logger, { ErrorCategory } from "@/utils/logger";
import correlationService from "@/utils/correlationService";

// Type for middleware that can either continue or short-circuit
type MiddlewareResult = { continue: true } | { continue: false };

// Authentication middleware - checks if user is joined to a room
export const requireAuthentication = (socket: SocketType): MiddlewareResult => {
  const { userId, roomCode, userName } = socket.data;
  const correlationId = correlationService.ensureCorrelationId(socket);

  logger.logSystemEvent("Authentication check started", "websocket_connect", {
    socketId: socket.id,
    hasUserId: !!userId,
    hasRoomCode: !!roomCode,
    hasUserName: !!userName,
    correlation_id: correlationId,
  });

  if (!userId || !roomCode) {
    logger.logError(
      "Authentication failed - missing required data",
      null,
      "authentication_error",
      {
        socketId: socket.id,
        userId: userId || "MISSING",
        roomCode: roomCode || "MISSING",
        userName: userName || "MISSING",
        correlation_id: correlationId,
      },
    );
    SocketErrorHandler.emitAuthenticationError(socket);
    return { continue: false };
  }

  logger.logSystemEvent("Authentication passed", "websocket_connect", {
    socketId: socket.id,
    userId,
    roomCode,
    userName,
    correlation_id: correlationId,
  });

  return { continue: true };
};

// Validation middleware for user name
export const validateUserName = (
  socket: SocketType,
  userName: string,
): MiddlewareResult => {
  if (!userName) {
    SocketErrorHandler.emitValidationError(socket, "userInfo");
    return { continue: false };
  }

  if (!userService.isValidUserName(userName)) {
    SocketErrorHandler.emitValidationError(socket, "userName");
    return { continue: false };
  }

  return { continue: true };
};

// Validation middleware for room code and user name (join-room specific)
export const validateJoinRoomData = (
  socket: SocketType,
  data: { roomCode: string; userName: string },
): MiddlewareResult => {
  const { roomCode, userName } = data;

  if (!roomCode || !userName) {
    SocketErrorHandler.emitValidationError(socket, "userInfo");
    return { continue: false };
  }

  if (!userService.isValidUserName(userName)) {
    SocketErrorHandler.emitValidationError(socket, "userName");
    return { continue: false };
  }

  return { continue: true };
};

// Validation middleware for votes
export const validateVote = (
  socket: SocketType,
  vote: FibonacciCard,
): MiddlewareResult => {
  if (!(FIBONACCI_CARDS as readonly string[]).includes(vote)) {
    SocketErrorHandler.emitInvalidVote(socket);
    return { continue: false };
  }
  return { continue: true };
};

// Room existence check middleware
export const requireRoom = (
  socket: SocketType,
  roomCode: string,
): MiddlewareResult => {
  const room = roomService.findRoom(roomCode);
  if (!room) {
    SocketErrorHandler.emitRoomNotFound(socket);
    return { continue: false };
  }
  return { continue: true };
};

// Permission middleware factory
export const requirePermission = (
  socket: SocketType,
  permissionCheck: (roomCode: string, userId: string) => boolean,
  action: "reveal" | "nextRound" | "settings" | "kick",
): MiddlewareResult => {
  const { userId, roomCode } = socket.data;

  if (!userId || !roomCode) {
    SocketErrorHandler.emitAuthenticationError(socket);
    return { continue: false };
  }

  if (!permissionCheck(roomCode, userId)) {
    SocketErrorHandler.emitPermissionError(socket, action);
    return { continue: false };
  }

  return { continue: true };
};

// Host-only permission check
export const requireHostPermission = (socket: SocketType): MiddlewareResult => {
  const { userId, roomCode } = socket.data;

  if (!userId || !roomCode) {
    SocketErrorHandler.emitAuthenticationError(socket);
    return { continue: false };
  }

  const room = roomService.findRoom(roomCode);
  if (!room) {
    SocketErrorHandler.emitRoomNotFound(socket);
    return { continue: false };
  }

  const hostUser = room.users[0];
  if (!hostUser || hostUser.id !== userId) {
    SocketErrorHandler.emitPermissionError(socket, "settings");
    return { continue: false };
  }

  return { continue: true };
};

// Error logging wrapper for handlers with correlation tracking
export const withErrorLogging = <T extends any[]>(
  handlerName: string,
  handler: (...args: T) => void,
) => {
  return (...args: T) => {
    const socket = args[0] as SocketType;
    const operationCorrelationId = socket
      ? correlationService.createOperationCorrelationId(socket, handlerName)
      : correlationService.generateCorrelationId();

    const startTime = Date.now();

    try {
      handler(...args);

      // Log successful operation completion
      if (socket) {
        const duration = Date.now() - startTime;
        logger.logPerformance(
          `${handlerName} handler completed successfully`,
          handlerName as any, // Type assertion for operation type
          duration,
          {
            socketId: socket.id,
            userId: socket.data.userId,
            roomCode: socket.data.roomCode,
            correlation_id: operationCorrelationId,
          },
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.logError(
        `Error in ${handlerName} handler`,
        error as Error,
        "system_error",
        {
          socketId: socket?.id,
          userId: socket?.data.userId,
          roomCode: socket?.data.roomCode,
          duration_ms: duration,
          correlation_id: operationCorrelationId,
          handler_name: handlerName,
        },
      );

      // Emit generic error if socket is available
      if (socket && typeof socket.emit === "function") {
        SocketErrorHandler.emitError(
          socket,
          `Failed to process ${handlerName}`,
        );
      }
    }
  };
};

// Middleware composer - helps chain multiple middleware checks
export const composeMiddleware = (
  socket: SocketType,
  ...middlewares: (() => MiddlewareResult)[]
): boolean => {
  for (const middleware of middlewares) {
    const result = middleware();
    if (!result.continue) {
      return false;
    }
  }
  return true;
};
