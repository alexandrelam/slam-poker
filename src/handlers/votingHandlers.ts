import { SocketType } from "@/types/socket.types";
import { FibonacciCard, FIBONACCI_CARDS } from "@/types/room.types";
import roomService from "@/services/roomService";
import permissionService from "@/services/permissionService";
import logger from "@/utils/logger";
import { SocketErrorHandler } from "@/utils/socketErrors";
import {
  requireAuthentication,
  validateVote,
  requirePermission,
  withErrorLogging,
} from "@/middleware/socketMiddleware";

// Cast vote handler
export const handleVote = withErrorLogging(
  "vote",
  (socket: SocketType, io: any, data: { vote: FibonacciCard }) => {
    logger.forceInfo("=== VOTE HANDLER START ===", {
      socketId: socket.id,
      vote: data.vote,
      socketData: socket.data,
    });

    // Check authentication
    const authResult = requireAuthentication(socket);
    if (!authResult.continue) {
      logger.forceWarn("Vote handler: authentication FAILED", {
        socketId: socket.id,
        socketData: socket.data,
        hasUserId: !!socket.data.userId,
        hasRoomCode: !!socket.data.roomCode,
      });
      return;
    }

    const { userId, roomCode } = socket.data;
    const { vote } = data;

    logger.forceInfo("Vote handler: authentication PASSED", {
      socketId: socket.id,
      userId,
      roomCode,
      userName: socket.data.userName,
    });

    // Validate vote
    const voteResult = validateVote(socket, vote);
    if (!voteResult.continue) {
      logger.forceWarn("Vote handler: vote validation FAILED", {
        socketId: socket.id,
        vote,
        voteType: typeof vote,
        isValidCard: (FIBONACCI_CARDS as readonly string[]).includes(vote),
      });
      return;
    }

    logger.forceInfo("Vote handler: vote validation PASSED", {
      socketId: socket.id,
      vote,
    });

    // Check if user exists in room and is online before casting vote
    const room = roomService.findRoom(roomCode!);
    if (room) {
      const user = room.users.find((u) => u.id === userId);
      logger.forceInfo("Vote handler: room and user status", {
        socketId: socket.id,
        roomExists: !!room,
        userExists: !!user,
        userIsOnline: user?.isOnline,
        userName: user?.name,
        roomUserCount: room.users.length,
      });
    }

    const updatedRoom = roomService.castVote(roomCode!, userId!, vote);
    if (!updatedRoom) {
      logger.forceWarn("Vote handler: castVote FAILED", {
        socketId: socket.id,
        roomCode,
        userId,
        roomExists: !!room,
        userExists: !!room?.users.find((u) => u.id === userId),
      });
      SocketErrorHandler.emitRoomNotFound(socket);
      return;
    }

    // Emit to all users in the room
    const emitData = {
      userId,
      hasVoted: true,
      room: updatedRoom,
    };

    io.to(roomCode).emit("vote-cast", emitData);

    logger.forceInfo("=== VOTE HANDLER SUCCESS ===", {
      socketId: socket.id,
      userId,
      roomCode,
      vote: "hidden",
      roomUserCount: updatedRoom.users.length,
      emittedTo: roomCode,
    });
  },
);

// Reveal votes handler
export const handleRevealVotes = withErrorLogging(
  "reveal-votes",
  (socket: SocketType, io: any) => {
    // Check authentication
    if (!requireAuthentication(socket).continue) return;

    const { userId, roomCode } = socket.data;

    // Check permission to reveal votes
    if (
      !requirePermission(
        socket,
        permissionService.canRevealVotes.bind(permissionService),
        "reveal",
      ).continue
    )
      return;

    const updatedRoom = roomService.revealVotes(roomCode!);
    if (!updatedRoom) {
      SocketErrorHandler.emitRoomNotFound(socket);
      return;
    }

    io.to(roomCode).emit("votes-revealed", { room: updatedRoom });

    logger.info("Votes revealed via socket", {
      socketId: socket.id,
      userId,
      roomCode,
    });
  },
);

// Next round handler
export const handleNextRound = withErrorLogging(
  "next-round",
  (socket: SocketType, io: any) => {
    // Check authentication
    if (!requireAuthentication(socket).continue) return;

    const { userId, roomCode } = socket.data;

    // Check permission to start next round
    if (
      !requirePermission(
        socket,
        permissionService.canStartNextRound.bind(permissionService),
        "nextRound",
      ).continue
    )
      return;

    const updatedRoom = roomService.startNextRound(roomCode!);
    if (!updatedRoom) {
      SocketErrorHandler.emitRoomNotFound(socket);
      return;
    }

    io.to(roomCode).emit("round-reset", { room: updatedRoom });

    logger.info("Next round started via socket", {
      socketId: socket.id,
      userId,
      roomCode,
    });
  },
);
