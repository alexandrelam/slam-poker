import winston from "winston";
import LokiTransport from "winston-loki";
import config from "@/config";
import { randomUUID } from "crypto";

// Standardized metadata interfaces for Grafana dashboards
interface StandardizedMetadata {
  operation_type?: OperationType;
  user_role?: UserRole;
  error_category?: ErrorCategory;
  event_type?: EventType;
  correlation_id?: string;
  duration_ms?: number;
  room_size?: number;
  concurrent_users?: number;
  session_id?: string;
}

// Enums for consistent labeling
export type OperationType =
  | "join_room"
  | "leave_room"
  | "cast_vote"
  | "reveal_votes"
  | "next_round"
  | "room_settings"
  | "kick_user"
  | "change_name"
  | "http_request"
  | "websocket_connect"
  | "websocket_disconnect"
  | "room_cleanup";

export type UserRole = "host" | "participant" | "system";

export type ErrorCategory =
  | "validation_error"
  | "authentication_error"
  | "permission_error"
  | "not_found_error"
  | "rate_limit_error"
  | "system_error"
  | "network_error";

export type EventType =
  | "user_action"
  | "system_event"
  | "error_event"
  | "performance_event"
  | "business_metric";

// Performance timing helper
export interface TimingContext {
  startTime: number;
  correlationId: string;
  operationType: OperationType;
}

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

  // Enhanced logging methods with standardized metadata
  logOperation(
    message: string,
    metadata: StandardizedMetadata & Record<string, any>,
    level: "info" | "warn" | "error" = "info",
  ) {
    const enrichedMeta = this.enrichMetadata(metadata);

    if (level === "info" && !this.isDevelopment && !metadata.event_type) {
      return; // Skip non-critical info logs in production
    }

    this.winston[level](message, enrichedMeta);
  }

  // User action logging with automatic role detection
  logUserAction(
    message: string,
    operationType: OperationType,
    metadata: {
      userId?: string;
      roomCode?: string;
      socketId?: string;
      userName?: string;
      isHost?: boolean;
      [key: string]: any;
    },
  ) {
    const userRole: UserRole = metadata.isHost ? "host" : "participant";

    this.logOperation(
      message,
      {
        ...metadata,
        operation_type: operationType,
        user_role: userRole,
        event_type: "user_action",
        correlation_id: metadata.correlation_id || this.generateCorrelationId(),
      },
      "info",
    );
  }

  // System event logging
  logSystemEvent(
    message: string,
    operationType: OperationType,
    metadata: Record<string, any> = {},
  ) {
    this.logOperation(
      message,
      {
        ...metadata,
        operation_type: operationType,
        user_role: "system",
        event_type: "system_event",
        correlation_id: metadata.correlation_id || this.generateCorrelationId(),
      },
      "info",
    );
  }

  // Enhanced error logging with categorization
  logError(
    message: string,
    error: Error | null,
    category: ErrorCategory,
    metadata: StandardizedMetadata & Record<string, any> = {},
  ) {
    const enrichedMeta = this.enrichMetadata({
      ...metadata,
      error_category: category,
      event_type: "error_event",
      correlation_id: metadata.correlation_id || this.generateCorrelationId(),
    });

    if (error) {
      enrichedMeta.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    this.winston.error(message, enrichedMeta);
  }

  // Performance logging
  logPerformance(
    message: string,
    operationType: OperationType,
    durationMs: number,
    metadata: Record<string, any> = {},
  ) {
    this.logOperation(
      message,
      {
        ...metadata,
        operation_type: operationType,
        event_type: "performance_event",
        duration_ms: durationMs,
        correlation_id: metadata.correlation_id || this.generateCorrelationId(),
      },
      "info",
    );
  }

  // Business metrics logging
  logBusinessMetric(
    message: string,
    metricData: {
      room_size?: number;
      concurrent_users?: number;
      vote_count?: number;
      session_duration_ms?: number;
      [key: string]: any;
    },
  ) {
    this.logOperation(
      message,
      {
        ...metricData,
        event_type: "business_metric",
        user_role: "system",
        correlation_id: this.generateCorrelationId(),
      },
      "info",
    );
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

  // Timing helpers
  startTiming(operationType: OperationType): TimingContext {
    return {
      startTime: Date.now(),
      correlationId: this.generateCorrelationId(),
      operationType,
    };
  }

  endTiming(
    context: TimingContext,
    message: string,
    metadata: Record<string, any> = {},
  ) {
    const duration = Date.now() - context.startTime;
    this.logPerformance(message, context.operationType, duration, {
      ...metadata,
      correlation_id: context.correlationId,
    });
    return duration;
  }

  // Generate correlation ID
  generateCorrelationId(): string {
    return randomUUID();
  }

  // Enrich metadata with additional context
  private enrichMetadata(
    metadata: StandardizedMetadata & Record<string, any>,
  ): Record<string, any> {
    const enriched = { ...metadata };

    // Add timestamp for better correlation
    enriched.timestamp = new Date().toISOString();

    // Add node instance info if available
    if (process.env.NODE_INSTANCE_ID) {
      enriched.node_instance = process.env.NODE_INSTANCE_ID;
    }

    // Ensure correlation_id exists
    if (!enriched.correlation_id) {
      enriched.correlation_id = this.generateCorrelationId();
    }

    return enriched;
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
