import { httpServer } from "./server";
import config from "@/config";
import logger from "@/utils/logger";
import metricsServer from "@/services/metricsServer";

const startServer = async () => {
  try {
    // Start metrics server first
    if (config.metrics.enabled) {
      try {
        await metricsServer.start();
      } catch (error) {
        logger.error('Failed to start metrics server, continuing without metrics', error as Error);
      }
    }

    // Start main server
    httpServer.listen(config.port, () => {
      logger.info(`🚀 SLAM Poker server running on port ${config.port}`);
      logger.info(`📡 Socket.IO server ready for connections`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
      if (config.metrics.enabled) {
        logger.info(`📊 Metrics server running on http://localhost:${config.metrics.port}/metrics`);
      }
    });
  } catch (error) {
    logger.error("Failed to start server", error as Error);
    process.exit(1);
  }
};

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  // Close metrics server first
  metricsServer.stop().then(() => {
    // Then close main server
    httpServer.close(() => {
      logger.info("All servers closed");
      process.exit(0);
    });
  }).catch((error) => {
    logger.error("Error during metrics server shutdown", error);
    // Still try to close main server
    httpServer.close(() => {
      logger.info("Main server closed");
      process.exit(1);
    });
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

startServer();
