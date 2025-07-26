import { httpServer } from "./server";
import config from "@/config";
import logger from "@/utils/logger";

const startServer = () => {
  try {
    httpServer.listen(config.port, () => {
      logger.info(`🚀 SLAM Poker server running on port ${config.port}`);
      logger.info(`📡 Socket.IO server ready for connections`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    logger.error("Failed to start server", error as Error);
    process.exit(1);
  }
};

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  httpServer.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

startServer();
