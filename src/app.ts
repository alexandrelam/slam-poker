import express from "express";
import path from "path";
import corsMiddleware from "@/middleware/cors";
import securityMiddleware from "@/middleware/security";
import logger from "@/utils/logger";

const app = express();

app.use(securityMiddleware);
app.use(corsMiddleware);
app.use(express.json());

// Enhanced HTTP request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const correlationId = logger.generateCorrelationId();

  // Add correlation ID to request for potential use in other middleware
  (req as any).correlationId = correlationId;

  // Log request start
  logger.logSystemEvent(
    `HTTP request started: ${req.method} ${req.path}`,
    "http_request",
    {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      user_agent: req.get("User-Agent"),
      content_type: req.get("Content-Type"),
      content_length: req.get("Content-Length"),
      referer: req.get("Referer"),
      correlation_id: correlationId,
      request_size_bytes: parseInt(req.get("Content-Length") || "0"),
    },
  );

  // Override res.end to capture response metrics
  const originalEnd = res.end.bind(res);

  // Use res.on('finish') instead of overriding res.end to avoid TypeScript issues
  res.on("finish", () => {
    const duration = Date.now() - startTime;

    // Log request completion with performance metrics
    logger.logPerformance(
      `HTTP request completed: ${req.method} ${req.path}`,
      "http_request",
      duration,
      {
        method: req.method,
        path: req.path,
        status_code: res.statusCode,
        status_message: res.statusMessage,
        response_size_bytes: res.get("Content-Length") || 0,
        ip: req.ip,
        user_agent: req.get("User-Agent"),
        correlation_id: correlationId,
        cache_hit: res.get("X-Cache-Status") === "HIT",
      },
    );

    // Log errors for non-2xx status codes
    if (res.statusCode >= 400) {
      const errorCategory =
        res.statusCode >= 500
          ? "system_error"
          : res.statusCode === 404
            ? "not_found_error"
            : res.statusCode === 401 || res.statusCode === 403
              ? "authentication_error"
              : "validation_error";

      logger.logError(
        `HTTP request failed: ${req.method} ${req.path}`,
        null,
        errorCategory,
        {
          method: req.method,
          path: req.path,
          status_code: res.statusCode,
          status_message: res.statusMessage,
          duration_ms: duration,
          ip: req.ip,
          user_agent: req.get("User-Agent"),
          correlation_id: correlationId,
        },
      );
    }
  });

  next();
});

app.get("/health", (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  // Log health check with system metrics
  logger.logSystemEvent("Health check endpoint accessed", "http_request", {
    uptime_seconds: uptime,
    memory_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    memory_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    correlation_id: (req as any).correlationId,
  });

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: uptime,
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    },
  });
});

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, "../web/dist")));

// Catch-all handler for React Router (SPA) - exclude API routes
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../web/dist/index.html"));
});

export default app;
