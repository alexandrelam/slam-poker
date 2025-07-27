import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import config from "@/config";
import logger from "@/utils/logger";
import roomService from "@/services/roomService";
import sessionTrackingService from "@/services/sessionTrackingService";
import errorTrackingService from "@/services/errorTrackingService";
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

// Periodic room, session, and error statistics logging (every 5 minutes)
const STATS_INTERVAL = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  try {
    roomService.logRoomStatistics();
    sessionTrackingService.logSessionStatistics();
    errorTrackingService.logErrorStatistics();

    // Log overall system health
    const healthScore = errorTrackingService.getSystemHealthScore();
    logger.logBusinessMetric("System health check", {
      health_score: healthScore,
      status:
        healthScore > 80
          ? "healthy"
          : healthScore > 60
            ? "degraded"
            : "unhealthy",
      active_rooms: roomService.getRoomCount(),
      active_sessions:
        sessionTrackingService.getSessionStatistics().totalActiveSessions,
    });
  } catch (error) {
    logger.logError(
      "Failed to log statistics",
      error as Error,
      "system_error",
      {},
    );
  }
}, STATS_INTERVAL);

// Periodic room, session, and error cleanup (every 30 minutes)
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
setInterval(() => {
  try {
    logger.logSystemEvent("Starting periodic cleanup", "room_cleanup", {
      interval_minutes: 30,
    });

    roomService.cleanupInactiveRooms();
    sessionTrackingService.cleanupStaleSessions();
    errorTrackingService.cleanupOldErrors();

    logger.logSystemEvent("Completed periodic cleanup", "room_cleanup", {
      remaining_rooms: roomService.getRoomCount(),
      interval_minutes: 30,
    });
  } catch (error) {
    logger.logError(
      "Failed to cleanup inactive rooms/sessions/errors",
      error as Error,
      "system_error",
      {},
    );
  }
}, CLEANUP_INTERVAL);

// Log server startup
logger.logSystemEvent("SLAM Poker server initialized", "websocket_connect", {
  port: config.port,
  environment: config.nodeEnv,
  loki_enabled: config.loki.enabled,
  cors_origins: Array.isArray(config.corsOrigin)
    ? config.corsOrigin.join(",")
    : config.corsOrigin,
  node_version: process.version,
  stats_interval_minutes: STATS_INTERVAL / 60000,
  cleanup_interval_minutes: CLEANUP_INTERVAL / 60000,
});

export { httpServer, io };
export default httpServer;
