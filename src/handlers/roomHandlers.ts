import { SocketType } from "@/types/socket.types";
import { RevealPermission, KickPermission } from "@/types/room.types";
import roomService from "@/services/roomService";
import userService from "@/services/userService";
import permissionService from "@/services/permissionService";
import socketTrackingService from "@/services/socketTrackingService";
import logger from "@/utils/logger";
import { SocketErrorHandler, ERROR_MESSAGES } from "@/utils/socketErrors";
import { RoomStateBroadcaster } from "@/utils/roomStateBroadcast";
import {
  requireAuthentication,
  requireRoom,
  requireHostPermission,
  withErrorLogging,
} from "@/middleware/socketMiddleware";

// Join room handler
export const handleJoinRoom = withErrorLogging(
  "join-room",
  (
    socket: SocketType,
    io: any,
    data: { roomCode: string; userName: string; userId: string },
  ) => {
    logger.forceInfo("=== JOIN ROOM HANDLER START ===", {
      socketId: socket.id,
      requestedRoomCode: data.roomCode,
      requestedUserName: data.userName,
      providedUserId: data.userId,
    });

    // Validate input data (now includes userId)
    const { roomCode, userName, userId } = data;

    if (!roomCode || !userName || !userId) {
      logger.forceWarn(
        "Join room: validation FAILED - missing required fields",
        {
          socketId: socket.id,
          hasRoomCode: !!roomCode,
          hasUserName: !!userName,
          hasUserId: !!userId,
          data,
        },
      );
      SocketErrorHandler.emitValidationError(socket, "userInfo");
      return;
    }

    if (!userService.isValidUserName(userName)) {
      logger.forceWarn("Join room: validation FAILED - invalid username", {
        socketId: socket.id,
        userName,
      });
      SocketErrorHandler.emitValidationError(socket, "userName");
      return;
    }

    const upperRoomCode = roomCode.toUpperCase();

    let room = roomService.findRoom(upperRoomCode);
    const isCreatingNewRoom = !room;

    if (!room) {
      logger.forceInfo(
        "Join room: creating NEW room with user-specified code",
        {
          socketId: socket.id,
          requestedRoomCode: upperRoomCode,
          userId,
        },
      );
      room = roomService.createRoomWithCode(upperRoomCode);

      if (!room) {
        logger.forceWarn(
          "Join room: FAILED to create room with specified code",
          {
            socketId: socket.id,
            requestedRoomCode: upperRoomCode,
            userId,
          },
        );
        SocketErrorHandler.emitError(
          socket,
          `Cannot create room with code "${roomCode}". Please try a different room code.`,
        );
        return;
      }
    } else {
      logger.forceInfo("Join room: joining EXISTING room", {
        socketId: socket.id,
        requestedRoomCode: upperRoomCode,
        actualRoomCode: room.code,
        existingUserCount: room.users.length,
        userId,
      });

      // Check for duplicate user in room
      const existingUser = room.users.find((u) => u.id === userId);
      if (existingUser) {
        let shouldReconnect = false;

        if (existingUser.isOnline) {
          logger.forceInfo(
            "Join room: DUPLICATE USER DETECTED - disconnecting existing connection",
            {
              socketId: socket.id,
              userId,
              userName: existingUser.name,
              roomCode: room.code,
            },
          );

          // Disconnect the existing socket connection
          const disconnected =
            socketTrackingService.disconnectExistingUserSocket(
              io,
              room.code,
              userId,
            );

          if (disconnected) {
            logger.forceInfo(
              "Join room: existing connection disconnected, will reconnect user",
              {
                socketId: socket.id,
                userId,
                roomCode: room.code,
              },
            );
            shouldReconnect = true;
          } else {
            logger.forceWarn(
              "Join room: failed to disconnect existing connection, treating as offline user",
              {
                socketId: socket.id,
                userId,
                roomCode: room.code,
              },
            );
            shouldReconnect = true; // Still try to reconnect
          }
        } else {
          // User is offline, can reconnect
          logger.forceInfo("Join room: user is offline, will reconnect", {
            socketId: socket.id,
            userId,
            userName: existingUser.name,
            roomCode: room.code,
          });
          shouldReconnect = true;
        }

        // Handle reconnection for both offline users and successfully disconnected users
        if (shouldReconnect) {
          logger.forceInfo("Join room: RECONNECTING user", {
            socketId: socket.id,
            userId,
            oldUserName: existingUser.name,
            newUserName: userName,
            roomCode: room.code,
            wasOnline: existingUser.isOnline,
          });

          // Update user as online and with new name if changed
          existingUser.isOnline = true;
          existingUser.name = userService.sanitizeUserName(userName);

          // Set socket data
          socket.data.userId = userId;
          socket.data.roomCode = room.code;
          socket.data.userName = existingUser.name;

          // Register this socket for the user
          socketTrackingService.registerUserSocket(
            room.code,
            userId,
            socket.id,
          );

          // Join socket to room
          socket.join(room.code);

          // Send complete room state to reconnecting user
          RoomStateBroadcaster.sendInitialState(socket, room, true);

          // Notify other users about reconnection
          socket
            .to(room.code)
            .emit("user-joined", { user: existingUser, room });

          logger.forceInfo("=== JOIN ROOM HANDLER SUCCESS (RECONNECTION) ===", {
            socketId: socket.id,
            userId,
            userName: existingUser.name,
            roomCode: room.code,
            wasReconnection: true,
            finalSocketData: socket.data,
          });
          return;
        }
      }
    }

    // Create new user with provided ID
    const sanitizedName = userService.sanitizeUserName(userName);
    const user = userService.createUserWithId(userId, sanitizedName);

    if (!user) {
      logger.forceWarn("Join room: user creation FAILED", {
        socketId: socket.id,
        userId,
        userName: sanitizedName,
      });
      SocketErrorHandler.emitError(
        socket,
        ERROR_MESSAGES.FAILED_TO_CREATE_USER,
      );
      return;
    }

    logger.forceInfo("Join room: user created with provided ID", {
      socketId: socket.id,
      userId: user.id,
      userName: user.name,
      userIsOnline: user.isOnline,
    });

    // Validate user ID matches what was requested
    if (user.id !== userId) {
      logger.forceWarn("Join room: userId mismatch after creation", {
        socketId: socket.id,
        requestedUserId: userId,
        actualUserId: user.id,
      });
      SocketErrorHandler.emitError(socket, ERROR_MESSAGES.USER_ID_MISMATCH);
      return;
    }

    // Set socket data
    socket.data.userId = user.id;
    socket.data.roomCode = room.code;
    socket.data.userName = user.name;

    // Register this socket for the user
    socketTrackingService.registerUserSocket(room.code, user.id, socket.id);

    logger.forceInfo("Join room: socket data set", {
      socketId: socket.id,
      socketData: socket.data,
    });

    // Re-validate room exists before adding user (edge case: room deleted during join process)
    const currentRoom = roomService.findRoom(room.code);
    if (!currentRoom) {
      logger.forceWarn("Join room: room no longer exists after user creation", {
        socketId: socket.id,
        roomCode: room.code,
        userId: user.id,
      });
      // Clean up socket tracking since room is gone
      socketTrackingService.removeUserSocket(room.code, user.id);
      SocketErrorHandler.emitError(
        socket,
        ERROR_MESSAGES.ROOM_NO_LONGER_EXISTS,
      );
      return;
    }

    const updatedRoom = roomService.addUserToRoom(room.code, user);
    if (!updatedRoom) {
      logger.forceWarn("Join room: addUserToRoom FAILED", {
        socketId: socket.id,
        roomCode: room.code,
        userId: user.id,
      });
      SocketErrorHandler.emitOperationError(socket, "join");
      return;
    }

    // Validate user was actually added to the room
    const userInRoom = updatedRoom.users.find((u) => u.id === userId);
    if (!userInRoom) {
      logger.forceWarn("Join room: user not found in room after addition", {
        socketId: socket.id,
        roomCode: room.code,
        userId,
        roomUsers: updatedRoom.users.map((u) => ({ id: u.id, name: u.name })),
      });
      SocketErrorHandler.emitError(
        socket,
        ERROR_MESSAGES.FAILED_TO_ADD_USER_TO_ROOM,
      );
      return;
    }

    // Join socket to room
    socket.join(room.code);

    logger.forceInfo("Join room: user added to room successfully", {
      socketId: socket.id,
      userId: user.id,
      roomCode: room.code,
      requestedRoomCode: upperRoomCode,
      roomCodesMatch: room.code === upperRoomCode,
      isHost: updatedRoom.users[0]?.id === user.id,
      totalUsersInRoom: updatedRoom.users.length,
      userIsOnline: updatedRoom.users.find((u) => u.id === user.id)?.isOnline,
    });

    // Send complete room state to new user
    RoomStateBroadcaster.sendInitialState(socket, updatedRoom, false);

    // Notify other users about new user and broadcast updated state
    socket.to(room.code).emit("user-joined", { user, room: updatedRoom });
    RoomStateBroadcaster.broadcastToRoom(io, room.code, {
      room: updatedRoom,
      reason: "user-joined",
      excludeSocketId: socket.id, // Don't send to the user who just joined (they got initial state)
    });

    logger.forceInfo("=== JOIN ROOM HANDLER SUCCESS ===", {
      socketId: socket.id,
      userId: user.id,
      userName: user.name,
      requestedRoomCode: upperRoomCode,
      actualRoomCode: room.code,
      roomCodesMatch: room.code === upperRoomCode,
      isNewRoom: isCreatingNewRoom,
      isHost: updatedRoom.users[0]?.id === user.id,
      finalSocketData: socket.data,
    });
  },
);

// Update room settings handler
export const handleUpdateRoomSettings = withErrorLogging(
  "update-room-settings",
  (
    socket: SocketType,
    io: any,
    data: {
      revealPermission?: RevealPermission;
      kickPermission?: KickPermission;
    },
  ) => {
    // Check authentication and host permission
    if (!requireAuthentication(socket).continue) return;
    if (!requireHostPermission(socket).continue) return;

    const { userId, roomCode } = socket.data;
    const { revealPermission, kickPermission } = data;

    const updatedRoom = roomService.updateRoomSettings(roomCode!, {
      revealPermission,
      kickPermission,
    });

    if (!updatedRoom) {
      SocketErrorHandler.emitRoomNotFound(socket);
      return;
    }

    // Broadcast updated room state to all users
    RoomStateBroadcaster.broadcastStateChange(
      io,
      roomCode!,
      updatedRoom,
      "settings-updated",
      { revealPermission, kickPermission },
    );

    // Also send legacy event for backward compatibility
    io.to(roomCode).emit("room-settings-updated", { room: updatedRoom });

    logger.forceInfo("Room settings updated via socket", {
      socketId: socket.id,
      userId,
      roomCode,
      revealPermission,
      kickPermission,
    });
  },
);
