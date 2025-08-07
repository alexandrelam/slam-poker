import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  corsOrigin: string | string[];
  loki: {
    url: string;
    enabled: boolean;
  };
  metrics: {
    enabled: boolean;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : ["http://localhost:3000", "http://localhost:5173"],
  loki: {
    url: process.env.LOKI_URL || "",
    enabled: process.env.LOKI_ENABLED === "true" && !!process.env.LOKI_URL,
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED !== "false", // Default to enabled
  },
};

export default config;
