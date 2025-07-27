import winston from "winston";
import LokiTransport from "winston-loki";
import config from "@/config";

class Logger {
  private winston: winston.Logger;
  private isDevelopment = config.nodeEnv === "development";

  constructor() {
    // Define base transports (console always enabled)
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr =
              Object.keys(meta).length > 0 ? JSON.stringify(meta) : "";
            return `${timestamp} [${level.toUpperCase()}] ${message} ${metaStr}`;
          }),
        ),
      }),
    ];

    // Add Loki transport if enabled and configured
    if (config.loki.enabled && config.loki.url) {
      try {
        const lokiTransport = new LokiTransport({
          host: config.loki.url,
          labels: {
            service: "slam-poker",
            environment: config.nodeEnv,
          },
          json: true,
          format: winston.format.json(),
          replaceTimestamp: true,
          onConnectionError: (err) => {
            const error = err instanceof Error ? err : new Error(String(err));
            console.warn(
              "Loki connection error, falling back to console only:",
              error.message,
            );
          },
        });

        transports.push(lokiTransport);
      } catch (error) {
        console.warn(
          "Failed to initialize Loki transport, falling back to console only:",
          error,
        );
      }
    }

    // Create Winston logger instance
    this.winston = winston.createLogger({
      level: this.isDevelopment ? "debug" : "info",
      transports,
      defaultMeta: {
        service: "slam-poker",
        environment: config.nodeEnv,
      },
    });
  }

  info(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      const meta = this.extractMeta(args);
      this.winston.info(message, meta);
    }
  }

  // Force certain critical logs to always show
  forceInfo(message: string, ...args: any[]) {
    const meta = this.extractMeta(args);
    this.winston.info(message, meta);
  }

  error(message: string, error?: Error, ...args: any[]) {
    const meta = this.extractMeta(args);
    if (error) {
      meta.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }
    this.winston.error(message, meta);
  }

  warn(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      const meta = this.extractMeta(args);
      this.winston.warn(message, meta);
    }
  }

  // Force certain critical warnings to always show
  forceWarn(message: string, ...args: any[]) {
    const meta = this.extractMeta(args);
    this.winston.warn(message, meta);
  }

  debug(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      const meta = this.extractMeta(args);
      this.winston.debug(message, meta);
    }
  }

  private extractMeta(args: any[]): Record<string, any> {
    const meta: Record<string, any> = {};
    args.forEach((arg, index) => {
      if (typeof arg === "object" && arg !== null) {
        Object.assign(meta, arg);
      } else {
        meta[`arg${index}`] = arg;
      }
    });
    return meta;
  }
}

export default new Logger();
