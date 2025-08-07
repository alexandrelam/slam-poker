import {
  register,
  collectDefaultMetrics,
  Gauge,
  Counter,
  Histogram,
} from "prom-client";
import logger from "@/utils/logger";

class MetricsService {
  private readonly registry = register;

  // Gauges - Current state metrics
  private readonly activeRoomsGauge = new Gauge({
    name: "slam_poker_active_rooms",
    help: "Number of currently active rooms",
    registers: [this.registry],
  });

  private readonly activeUsersGauge = new Gauge({
    name: "slam_poker_active_users",
    help: "Number of currently active users across all rooms",
    registers: [this.registry],
  });

  private readonly activeSessionsGauge = new Gauge({
    name: "slam_poker_active_sessions",
    help: "Number of currently active user sessions",
    registers: [this.registry],
  });

  private readonly systemHealthGauge = new Gauge({
    name: "slam_poker_system_health_score",
    help: "Overall system health score (0-100)",
    registers: [this.registry],
  });

  private readonly peakUsersGauge = new Gauge({
    name: "slam_poker_peak_users_in_room",
    help: "Peak number of users in any room",
    labelNames: ["room_code"],
    registers: [this.registry],
  });

  // Counters - Accumulating metrics
  private readonly roomsCreatedCounter = new Counter({
    name: "slam_poker_rooms_created_total",
    help: "Total number of rooms created",
    registers: [this.registry],
  });

  private readonly userJoinsCounter = new Counter({
    name: "slam_poker_user_joins_total",
    help: "Total number of user joins across all rooms",
    registers: [this.registry],
  });

  private readonly votesCastCounter = new Counter({
    name: "slam_poker_votes_cast_total",
    help: "Total number of votes cast",
    labelNames: ["room_code"],
    registers: [this.registry],
  });

  private readonly websocketConnectionsCounter = new Counter({
    name: "slam_poker_websocket_connections_total",
    help: "Total number of WebSocket connections",
    labelNames: ["event_type"], // connect, disconnect
    registers: [this.registry],
  });

  private readonly httpRequestsCounter = new Counter({
    name: "slam_poker_http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "path", "status_code"],
    registers: [this.registry],
  });

  private readonly errorsCounter = new Counter({
    name: "slam_poker_errors_total",
    help: "Total number of errors by category",
    labelNames: ["error_category"], // system_error, validation_error, etc.
    registers: [this.registry],
  });

  private readonly roomLifecycleCounter = new Counter({
    name: "slam_poker_room_lifecycle_events_total",
    help: "Room lifecycle events",
    labelNames: ["event_type"], // created, joined, left, voting_started, votes_revealed
    registers: [this.registry],
  });

  // Histograms - Distribution metrics
  private readonly httpRequestDurationHistogram = new Histogram({
    name: "slam_poker_http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "path"],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5], // in seconds
    registers: [this.registry],
  });

  private readonly websocketEventDurationHistogram = new Histogram({
    name: "slam_poker_websocket_event_duration_seconds",
    help: "WebSocket event processing duration in seconds",
    labelNames: ["event_type"],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1], // in seconds
    registers: [this.registry],
  });

  private readonly sessionDurationHistogram = new Histogram({
    name: "slam_poker_session_duration_seconds",
    help: "User session duration in seconds",
    buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800], // 1min to 8hrs
    registers: [this.registry],
  });

  private readonly votingRoundDurationHistogram = new Histogram({
    name: "slam_poker_voting_round_duration_seconds",
    help: "Voting round duration from start to reveal in seconds",
    labelNames: ["room_code"],
    buckets: [10, 30, 60, 120, 300, 600, 1200], // 10sec to 20min
    registers: [this.registry],
  });

  constructor() {
    // Collect default Node.js metrics (memory, CPU, etc.)
    collectDefaultMetrics({
      register: this.registry,
      prefix: "slam_poker_",
    });

    logger.info("Prometheus metrics service initialized");
  }

  // Gauge update methods
  setActiveRooms(count: number): void {
    this.activeRoomsGauge.set(count);
  }

  setActiveUsers(count: number): void {
    this.activeUsersGauge.set(count);
  }

  setActiveSessions(count: number): void {
    this.activeSessionsGauge.set(count);
  }

  setSystemHealth(score: number): void {
    this.systemHealthGauge.set(score);
  }

  setPeakUsersInRoom(roomCode: string, count: number): void {
    this.peakUsersGauge.set({ room_code: roomCode }, count);
  }

  // Counter increment methods
  incrementRoomsCreated(): void {
    this.roomsCreatedCounter.inc();
  }

  incrementUserJoins(): void {
    this.userJoinsCounter.inc();
  }

  incrementVotesCast(roomCode: string): void {
    this.votesCastCounter.inc({ room_code: roomCode });
  }

  incrementWebsocketConnections(eventType: "connect" | "disconnect"): void {
    this.websocketConnectionsCounter.inc({ event_type: eventType });
  }

  incrementHttpRequests(
    method: string,
    path: string,
    statusCode: number,
  ): void {
    this.httpRequestsCounter.inc({
      method,
      path,
      status_code: statusCode.toString(),
    });
  }

  incrementErrors(errorCategory: string): void {
    this.errorsCounter.inc({ error_category: errorCategory });
  }

  incrementRoomLifecycleEvent(eventType: string): void {
    this.roomLifecycleCounter.inc({ event_type: eventType });
  }

  // Histogram observation methods
  observeHttpRequestDuration(
    method: string,
    path: string,
    durationSeconds: number,
  ): void {
    this.httpRequestDurationHistogram.observe(
      { method, path },
      durationSeconds,
    );
  }

  observeWebsocketEventDuration(
    eventType: string,
    durationSeconds: number,
  ): void {
    this.websocketEventDurationHistogram.observe(
      { event_type: eventType },
      durationSeconds,
    );
  }

  observeSessionDuration(durationSeconds: number): void {
    this.sessionDurationHistogram.observe(durationSeconds);
  }

  observeVotingRoundDuration(roomCode: string, durationSeconds: number): void {
    this.votingRoundDurationHistogram.observe(
      { room_code: roomCode },
      durationSeconds,
    );
  }

  // Get metrics for /metrics endpoint
  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Clear all metrics (useful for testing)
  clearMetrics(): void {
    this.registry.clear();
  }

  // Update all current state metrics from services
  updateCurrentStateMetrics(stats: {
    activeRooms: number;
    activeUsers: number;
    activeSessions: number;
    systemHealth: number;
    roomMetrics?: Array<{ roomCode: string; peakUsers: number }>;
  }): void {
    this.setActiveRooms(stats.activeRooms);
    this.setActiveUsers(stats.activeUsers);
    this.setActiveSessions(stats.activeSessions);
    this.setSystemHealth(stats.systemHealth);

    if (stats.roomMetrics) {
      stats.roomMetrics.forEach((room) => {
        this.setPeakUsersInRoom(room.roomCode, room.peakUsers);
      });
    }
  }
}

const metricsService = new MetricsService();
export default metricsService;
