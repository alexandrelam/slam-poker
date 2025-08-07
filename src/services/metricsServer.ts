import express from 'express';
import { Server } from 'http';
import metricsService from '@/services/metricsService';
import config from '@/config';
import logger from '@/utils/logger';

class MetricsServer {
  private app: express.Application;
  private server?: Server;

  constructor() {
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes(): void {

    // Health check endpoint for the metrics server
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'metrics-server',
        timestamp: new Date().toISOString(),
      });
    });

    // Main metrics endpoint that Prometheus will scrape
    this.app.get('/metrics', async (req, res) => {
      try {
        const metrics = await metricsService.getMetrics();
        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.send(metrics);
      } catch (error) {
        logger.error('Failed to generate metrics', error as Error);
        res.status(500).send('Error generating metrics');
      }
    });

    // Catch-all for unsupported endpoints
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not found',
        message: 'Available endpoints: /health, /metrics',
      });
    });
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!config.metrics.enabled) {
        logger.info('Metrics server is disabled');
        resolve();
        return;
      }

      this.server = this.app.listen(config.metrics.port, 'localhost', () => {
        logger.info(
          `📊 Prometheus metrics server running on http://localhost:${config.metrics.port}`,
        );
        logger.info(`🔍 Metrics endpoint: http://localhost:${config.metrics.port}/metrics`);
        resolve();
      });

      this.server.on('error', (error) => {
        logger.error('Failed to start metrics server', error);
        reject(error);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close(() => {
        logger.info('Metrics server stopped');
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
