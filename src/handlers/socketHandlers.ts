import { Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@/types/socket.types";
import { FIBONACCI_CARDS } from "@/types/room.types";
import roomService from "@/services/roomService";
import userService from "@/services/userService";
import logger from "@/utils/logger";

type SocketType = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export const handleSocketConnection = (socket: SocketType, io: any) => {
  socket.on("join-room", ({ roomCode, userName }) => {
    try {
      if (!roomCode || !userName) {
        socket.emit("error", {
          message: "Room code and user name are required",
        });
        return;
      }

      if (!userService.isValidUserName(userName)) {
        socket.emit("error", {
          message: "Invalid user name. Must be 1-50 characters.",
        });
        return;
      }

      let room = roomService.findRoom(roomCode.toUpperCase());

      if (!room) {
        room = roomService.createRoom();
      }

      const sanitizedName = userService.sanitizeUserName(userName);
      const user = userService.createUser(sanitizedName);

      socket.data.userId = user.id;
      socket.data.roomCode = room.code;
      socket.data.userName = user.name;

      const updatedRoom = roomService.addUserToRoom(room.code, user);
      if (!updatedRoom) {
        socket.emit("error", { message: "Failed to join room" });
        return;
      }

      socket.join(room.code);

      socket.emit("user-joined", { user, room: updatedRoom });
      socket.to(room.code).emit("user-joined", { user, room: updatedRoom });

      logger.info("User joined room via socket", {
        socketId: socket.id,
        userId: user.id,
        userName: user.name,
        roomCode: room.code,
      });
    } catch (error) {
      logger.error("Error in join-room handler", error as Error);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  socket.on("vote", ({ vote }) => {
    try {
      const { userId, roomCode } = socket.data;

      if (!userId || !roomCode) {
        socket.emit("error", { message: "Not joined to any room" });
        return;
      }

      if (!FIBONACCI_CARDS.includes(vote)) {
        socket.emit("invalid-vote");
        return;
      }

      const updatedRoom = roomService.castVote(roomCode, userId, vote);
      if (!updatedRoom) {
        socket.emit("room-not-found");
        return;
      }

      io.to(roomCode).emit("vote-cast", {
        userId,
        hasVoted: true,
        room: updatedRoom,
      });

      logger.info("Vote cast via socket", {
        socketId: socket.id,
        userId,
        roomCode,
        vote: "hidden",
      });
    } catch (error) {
      logger.error("Error in vote handler", error as Error);
      socket.emit("error", { message: "Failed to cast vote" });
    }
  });

  socket.on("reveal-votes", () => {
    try {
      const { userId, roomCode } = socket.data;

      if (!userId || !roomCode) {
        socket.emit("error", { message: "Not joined to any room" });
        return;
      }

      // Check if user has permission to reveal votes
      if (!roomService.canUserRevealVotes(roomCode, userId)) {
        socket.emit("error", {
          message: "You don't have permission to reveal votes",
        });
        return;
      }

      const updatedRoom = roomService.revealVotes(roomCode);
      if (!updatedRoom) {
        socket.emit("room-not-found");
        return;
      }

      io.to(roomCode).emit("votes-revealed", { room: updatedRoom });

      logger.info("Votes revealed via socket", {
        socketId: socket.id,
        userId,
        roomCode,
      });
    } catch (error) {
      logger.error("Error in reveal-votes handler", error as Error);
      socket.emit("error", { message: "Failed to reveal votes" });
    }
  });

  socket.on("next-round", () => {
    try {
      const { userId, roomCode } = socket.data;

      if (!userId || !roomCode) {
        socket.emit("error", { message: "Not joined to any room" });
        return;
      }

      // Check if user has permission to start next round
      if (!roomService.canUserStartNextRound(roomCode, userId)) {
        socket.emit("error", {
          message: "You don't have permission to start the next round",
        });
        return;
      }

      const updatedRoom = roomService.startNextRound(roomCode);
      if (!updatedRoom) {
        socket.emit("room-not-found");
        return;
      }

      io.to(roomCode).emit("round-reset", { room: updatedRoom });

      logger.info("Next round started via socket", {
        socketId: socket.id,
        userId,
        roomCode,
      });
    } catch (error) {
      logger.error("Error in next-round handler", error as Error);
      socket.emit("error", { message: "Failed to start next round" });
    }
  });

  socket.on("update-room-settings", ({ revealPermission }) => {
    try {
      const { userId, roomCode } = socket.data;

      if (!userId || !roomCode) {
        socket.emit("error", { message: "Not joined to any room" });
        return;
      }

      // Only the host (first user) can update room settings
      const room = roomService.findRoom(roomCode);
      if (!room) {
        socket.emit("room-not-found");
        return;
      }

      const hostUser = room.users[0];
      if (!hostUser || hostUser.id !== userId) {
        socket.emit("error", {
          message: "Only the host can update room settings",
        });
        return;
      }

      const updatedRoom = roomService.updateRoomSettings(roomCode, {
        revealPermission,
      });
      if (!updatedRoom) {
        socket.emit("room-not-found");
        return;
      }

      io.to(roomCode).emit("room-settings-updated", { room: updatedRoom });

      logger.info("Room settings updated via socket", {
        socketId: socket.id,
        userId,
        roomCode,
        revealPermission,
      });
    } catch (error) {
      logger.error("Error in update-room-settings handler", error as Error);
      socket.emit("error", { message: "Failed to update room settings" });
    }
  });

  socket.on("disconnect", (reason) => {
    try {
      const { userId, roomCode } = socket.data;

      if (userId && roomCode) {
        const updatedRoom = roomService.removeUserFromRoom(roomCode, userId);

        if (updatedRoom) {
          socket.to(roomCode).emit("user-left", { userId, room: updatedRoom });
        }

        logger.info("User disconnected and removed from room", {
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
    } catch (error) {
      logger.error("Error in disconnect handler", error as Error);
    }
  });
};
