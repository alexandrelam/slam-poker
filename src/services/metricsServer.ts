import express from "express";
import { Server } from "http";
import metricsService from "@/services/metricsService";
import config from "@/config";
import logger from "@/utils/logger";
import { Pushgateway } from "prom-client";

class MetricsServer {
  private app: express.Application;
  private server?: Server;
  private pushGateway?: Pushgateway<any>;
  private pushInterval?: NodeJS.Timeout;

  constructor() {
    this.app = express();
    this.setupRoutes();
    this.setupPushGateway();
  }

  private setupPushGateway(): void {
    if (config.metrics.prometheusUrl) {
      try {
        this.pushGateway = new Pushgateway(config.metrics.prometheusUrl, {
          timeout: 5000,
        });
        logger.info(
          `Prometheus Pushgateway configured: ${config.metrics.prometheusUrl}`,
        );

        // Start periodic push (every 15 seconds)
        this.pushInterval = setInterval(async () => {
          await this.pushMetrics();
        }, 15000);

        logger.info("Metrics push interval started (15s)");
      } catch (error) {
        logger.error("Failed to setup Prometheus Pushgateway", error as Error);
      }
    }
  }

  private async pushMetrics(): Promise<void> {
    if (!this.pushGateway) return;

    try {
      await this.pushGateway.pushAdd({
        jobName: "slam-poker",
        groupings: {
          instance: `localhost:${config.port}`,
          service: "slam-poker-backend",
        },
      });
      logger.debug("Metrics pushed to Prometheus successfully");
    } catch (error) {
      logger.error("Failed to push metrics to Prometheus", error as Error);
    }
  }

  private setupRoutes(): void {
    // Health check endpoint for the metrics server
    this.app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        service: "metrics-server",
        timestamp: new Date().toISOString(),
      });
    });

    // Main metrics endpoint that Prometheus will scrape
    this.app.get("/metrics", async (req, res) => {
      try {
        const metrics = await metricsService.getMetrics();
        res.set("Content-Type", "text/plain; charset=utf-8");
        res.send(metrics);
      } catch (error) {
        logger.error("Failed to generate metrics", error as Error);
        res.status(500).send("Error generating metrics");
      }
    });

    // Catch-all for unsupported endpoints
    this.app.use((req, res) => {
      res.status(404).json({
        error: "Not found",
        message: "Available endpoints: /health, /metrics",
      });
    });
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!config.metrics.enabled) {
        logger.info("Metrics server is disabled");
        resolve();
        return;
      }

      this.server = this.app.listen(config.metrics.port, "localhost", () => {
        logger.info(
          `📊 Prometheus metrics server running on http://localhost:${config.metrics.port}`,
        );
        logger.info(
          `🔍 Metrics endpoint: http://localhost:${config.metrics.port}/metrics`,
        );
        resolve();
      });

      this.server.on("error", (error) => {
        logger.error("Failed to start metrics server", error);
        reject(error);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      // Clear push interval
      if (this.pushInterval) {
        clearInterval(this.pushInterval);
        this.pushInterval = undefined;
      }

      if (!this.server) {
        resolve();
        return;
      }

      this.server.close(() => {
        logger.info("Metrics server stopped");
        resolve();
      });
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}

const metricsServer = new MetricsServer();
export default metricsServer;
