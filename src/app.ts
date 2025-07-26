import express from "express";
import path from "path";
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

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, "../web/dist")));

export default app;
