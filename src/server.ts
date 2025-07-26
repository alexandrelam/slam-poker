import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import config from "@/config";
import logger from "@/utils/logger";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@/types/socket.types";
import { handleSocketConnection } from "@/handlers/socketHandlers";

const httpServer = createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  logger.info("User connected", { socketId: socket.id });
  handleSocketConnection(socket, io);
});

export { httpServer, io };
export default httpServer;
