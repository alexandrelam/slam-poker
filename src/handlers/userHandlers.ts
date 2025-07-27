import { SocketType } from "@/types/socket.types";
import roomService from "@/services/roomService";
import userService from "@/services/userService";
import permissionService from "@/services/permissionService";
import socketTrackingService from "@/services/socketTrackingService";
import sessionTrackingService from "@/services/sessionTrackingService";
import logger from "@/utils/logger";
import { SocketErrorHandler } from "@/utils/socketErrors";
import { RoomStateBroadcaster } from "@/utils/roomStateBroadcast";
import {
  requireAuthentication,
  validateUserName,
  requirePermission,
  withErrorLogging,
} from "@/middleware/socketMiddleware";

// Kick user handler
export const handleKickUser = withErrorLogging(
  "kick-user",
  (socket: SocketType, io: any, data: { userIdToKick: string }) => {
    // Check authentication
    if (!requireAuthentication(socket).continue) return;

    const { userId, roomCode } = socket.data;
    const { userIdToKick } = data;

    // Validate input
    if (!userIdToKick) {
      SocketErrorHandler.emitValidationError(socket, "userIdToKick");
      return;
    }

    // Check permission to kick users
    if (
      !requirePermission(
        socket,
        permissionService.canKickDisconnectedUsers.bind(permissionService),
        "kick",
      ).continue
    )
      return;

    // Get user info before kicking for the event
    const room = roomService.findRoom(roomCode!);
    if (!room) {
      SocketErrorHandler.emitRoomNotFound(socket);
      return;
    }

    const userToKick = room.users.find((u) => u.id === userIdToKick);
    if (!userToKick) {
      SocketErrorHandler.emitError(socket, "User not found in room");
      return;
    }

    // Check if this specific user can be kicked
    if (!permissionService.canKickUser(roomCode!, userId!, userIdToKick)) {
      SocketErrorHandler.emitOperationError(socket, "kick");
      return;
    }

    const updatedRoom = roomService.kickUser(roomCode!, userIdToKick);
    if (!updatedRoom) {
      SocketErrorHandler.emitOperationError(socket, "kick");
      return;
    }

    // Broadcast updated room state to all users
    RoomStateBroadcaster.broadcastStateChange(
      io,
      roomCode!,
      updatedRoom,
      "user-kicked",
      { userId: userIdToKick, userName: userToKick.name },
    );

    // Also send legacy event for backward compatibility
    io.to(roomCode).emit("user-kicked", {
      userId: userIdToKick,
      userName: userToKick.name,
      room: updatedRoom,
    });

    logger.forceInfo("User kicked via socket", {
      socketId: socket.id,
      kickerId: userId,
      userIdToKick,
      userName: userToKick.name,
      roomCode,
    });
  },
);

// Change name handler
export const handleChangeName = withErrorLogging(
  "change-name",
  (socket: SocketType, io: any, data: { newName: string }) => {
    logger.info("ChangeName handler called", {
      socketId: socket.id,
      newName: data.newName,
    });

    // Check authentication
    if (!requireAuthentication(socket).continue) {
      logger.warn("ChangeName handler: authentication failed", {
        socketId: socket.id,
      });
      return;
    }

    const { userId, roomCode } = socket.data;
    const { newName } = data;

    logger.info("ChangeName handler: authentication passed", {
      socketId: socket.id,
      userId,
      roomCode,
    });

    // Validate new name
    if (!newName || typeof newName !== "string") {
      logger.warn("ChangeName handler: invalid name type", {
        socketId: socket.id,
        newName,
        type: typeof newName,
      });
      SocketErrorHandler.emitValidationError(socket, "name");
      return;
    }

    if (!validateUserName(socket, newName).continue) {
      logger.warn("ChangeName handler: name validation failed", {
        socketId: socket.id,
        newName,
      });
      return;
    }

    logger.info("ChangeName handler: name validation passed", {
      socketId: socket.id,
      newName,
    });

    // Check if user can change their own name
    if (!permissionService.canChangeOwnName(roomCode!, userId!)) {
      logger.warn("ChangeName handler: permission denied", {
        socketId: socket.id,
        userId,
        roomCode,
      });
      SocketErrorHandler.emitOperationError(socket, "changeName");
      return;
    }

    logger.info("ChangeName handler: permission check passed", {
      socketId: socket.id,
    });

    const updatedRoom = roomService.changeUserName(roomCode!, userId!, newName);
    if (!updatedRoom) {
      logger.warn("ChangeName handler: changeUserName failed", {
        socketId: socket.id,
        roomCode,
        userId,
        newName,
      });
      SocketErrorHandler.emitOperationError(socket, "changeName");
      return;
    }

    // Update socket data with new name
    socket.data.userName = userService.sanitizeUserName(newName);

    // Broadcast updated room state to all users
    RoomStateBroadcaster.broadcastStateChange(
      io,
      roomCode!,
      updatedRoom,
      "name-changed",
      { userId, newName: socket.data.userName },
    );

    // Also send legacy event for backward compatibility
    io.in(roomCode).emit("name-changed", {
      userId,
      newName: socket.data.userName,
      room: updatedRoom,
    });

    logger.forceInfo("User name changed successfully via socket", {
      socketId: socket.id,
      userId,
      roomCode,
      newName: socket.data.userName,
    });
  },
);

// Disconnect handler
export const handleDisconnect = withErrorLogging(
  "disconnect",
  (socket: SocketType, io: any, reason: string) => {
    const { userId, roomCode } = socket.data;

    // Always clean up socket tracking, even if user data is incomplete
    socketTrackingService.removeSocketFromAllRooms(socket.id);

    if (userId && roomCode) {
      // End session tracking
      sessionTrackingService.endSession(userId, reason);

      // Remove user from room
      const updatedRoom = roomService.removeUserFromRoom(roomCode, userId);

      // Also remove from socket tracking specifically for this room/user
      socketTrackingService.removeUserSocket(roomCode, userId);

      if (updatedRoom) {
        // Broadcast updated room state to remaining users
        RoomStateBroadcaster.broadcastToRoom(io, roomCode, {
          room: updatedRoom,
          reason: "user-disconnected",
          excludeSocketId: socket.id, // Exclude the disconnecting user
        });

        // Also send legacy event for backward compatibility
        socket.to(roomCode).emit("user-left", { userId, room: updatedRoom });
      }

      logger.forceInfo("User disconnected and removed from room", {
        socketId: socket.id,
        userId,
        roomCode,
        reason,
      });
    } else {
      logger.info("User disconnected without joining room", {
        socketId: socket.id,
        reason,
      });
    }
  },
);
