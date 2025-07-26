import { SocketType } from "@/types/socket.types";
import { SocketErrorHandler } from "@/utils/socketErrors";
import userService from "@/services/userService";
import roomService from "@/services/roomService";
import { FIBONACCI_CARDS, FibonacciCard } from "@/types/room.types";
import logger from "@/utils/logger";

// Type for middleware that can either continue or short-circuit
type MiddlewareResult = { continue: true } | { continue: false };

// Authentication middleware - checks if user is joined to a room
export const requireAuthentication = (socket: SocketType): MiddlewareResult => {
  const { userId, roomCode, userName } = socket.data;

  logger.forceInfo("Authentication check", {
    socketId: socket.id,
    hasUserId: !!userId,
    hasRoomCode: !!roomCode,
    hasUserName: !!userName,
    socketData: socket.data,
  });

  if (!userId || !roomCode) {
    logger.forceWarn("Authentication FAILED - missing data", {
      socketId: socket.id,
      userId: userId || "MISSING",
      roomCode: roomCode || "MISSING",
      userName: userName || "MISSING",
      fullSocketData: socket.data,
    });
    SocketErrorHandler.emitAuthenticationError(socket);
    return { continue: false };
  }

  logger.forceInfo("Authentication PASSED", {
    socketId: socket.id,
    userId,
    roomCode,
    userName,
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

// Error logging wrapper for handlers
export const withErrorLogging = <T extends any[]>(
  handlerName: string,
  handler: (...args: T) => void,
) => {
  return (...args: T) => {
    try {
      handler(...args);
    } catch (error) {
      logger.error(`Error in ${handlerName} handler`, error as Error);
      // Emit generic error if socket is available
      const socket = args[0] as SocketType;
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
