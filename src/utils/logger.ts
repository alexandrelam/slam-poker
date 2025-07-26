import config from "@/config";

class Logger {
  private isDevelopment = config.nodeEnv === "development";

  info(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  error(message: string, error?: Error, ...args: any[]) {
    console.error(
      `[ERROR] ${new Date().toISOString()} - ${message}`,
      error,
      ...args,
    );
  }

  warn(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.debug(
        `[DEBUG] ${new Date().toISOString()} - ${message}`,
        ...args,
      );
    }
  }
}

export default new Logger();
