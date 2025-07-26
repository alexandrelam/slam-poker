import express from "express";
import corsMiddleware from "@/middleware/cors";
import securityMiddleware from "@/middleware/security";
import logger from "@/utils/logger";

const app = express();

app.use(securityMiddleware);
app.use(corsMiddleware);
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({
    message: "SLAM Poker Backend API",
    version: "1.0.0",
  });
});

export default app;
