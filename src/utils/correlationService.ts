import { randomUUID } from "crypto";
import { SocketType } from "@/types/socket.types";

/**
 * Correlation service for tracking requests across WebSocket operations
 * Enables distributed tracing and better log correlation in Grafana
 */
class CorrelationService {
  private static instance: CorrelationService;
  private socketCorrelations = new Map<string, string>();

  static getInstance(): CorrelationService {
    if (!CorrelationService.instance) {
      CorrelationService.instance = new CorrelationService();
    }
    return CorrelationService.instance;
  }

  /**
   * Generate a new correlation ID
   */
  generateCorrelationId(): string {
    return randomUUID();
  }

  /**
   * Set correlation ID for a socket connection
   */
  setSocketCorrelationId(socket: SocketType, correlationId?: string): string {
    const id = correlationId || this.generateCorrelationId();
    this.socketCorrelations.set(socket.id, id);

    // Also store in socket data for easy access
    socket.data.correlationId = id;

    return id;
  }

  /**
   * Get correlation ID for a socket
   */
  getSocketCorrelationId(socket: SocketType): string {
    // First check socket data
    if (socket.data.correlationId) {
      return socket.data.correlationId;
    }

    // Then check our internal map
    const existing = this.socketCorrelations.get(socket.id);
    if (existing) {
      socket.data.correlationId = existing;
      return existing;
    }

    // Generate new one if none exists
    return this.setSocketCorrelationId(socket);
  }

  /**
   * Create a new correlation ID for a specific operation while preserving the socket's main ID
   */
  createOperationCorrelationId(socket: SocketType, operation: string): string {
    const baseId = this.getSocketCorrelationId(socket);
    return `${baseId}-${operation}-${Date.now()}`;
  }

  /**
   * Remove correlation tracking when socket disconnects
   */
  removeSocketCorrelation(socketId: string): void {
    this.socketCorrelations.delete(socketId);
  }

  /**
   * Get all active correlations (for debugging)
   */
  getActiveCorrelations(): Map<string, string> {
    return new Map(this.socketCorrelations);
  }

  /**
   * Middleware to ensure every socket operation has a correlation ID
   */
  ensureCorrelationId(socket: SocketType): string {
    return this.getSocketCorrelationId(socket);
  }

  /**
   * Clean up stale correlations (should be called periodically)
   */
  cleanup(): void {
    // In a real implementation, you might want to track timestamps
    // and clean up correlations older than a certain threshold
    // For now, we rely on explicit cleanup on disconnect
  }
}

export default CorrelationService.getInstance();
