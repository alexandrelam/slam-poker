import { SocketType } from "@/types/socket.types";
import logger from "@/utils/logger";

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

export const handleSocketConnection = (socket: SocketType, io: any) => {
  // Room-related events
  socket.on("join-room", (data) => handleJoinRoom(socket, io, data));
  socket.on("update-room-settings", (data) =>
    handleUpdateRoomSettings(socket, io, data),
  );

  // Voting-related events
  socket.on("vote", (data) => handleVote(socket, io, data));
  socket.on("reveal-votes", () => handleRevealVotes(socket, io));
  socket.on("next-round", () => handleNextRound(socket, io));

  // User management events
  socket.on("kick-user", (data) => handleKickUser(socket, io, data));
  socket.on("change-name", (data) => handleChangeName(socket, io, data));
  socket.on("disconnect", (reason) => handleDisconnect(socket, reason));

  logger.info("Socket connection established with modular handlers", {
    socketId: socket.id,
  });
};
