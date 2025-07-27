import logger from "@/utils/logger";

interface UserSession {
  userId: string;
  userName: string;
  socketId: string;
  roomCode: string;
  sessionStart: Date;
  lastActivity: Date;
  joinCount: number;
  votesCast: number;
  reconnections: number;
  correlationId: string;
}

/**
 * Service for tracking user sessions and engagement metrics
 * Provides data for Grafana dashboards on user behavior
 */
class SessionTrackingService {
  private sessions: Map<string, UserSession> = new Map();

  /**
   * Start tracking a user session
   */
  startSession(
    userId: string,
    userName: string,
    socketId: string,
    roomCode: string,
    correlationId: string,
    isReconnection: boolean = false,
  ): void {
    const now = new Date();

    const existingSession = this.sessions.get(userId);
    if (existingSession) {
      // Update existing session for reconnection
      existingSession.socketId = socketId;
      existingSession.lastActivity = now;
      existingSession.reconnections += isReconnection ? 1 : 0;

      logger.logBusinessMetric("User session reconnected", {
        userId,
        userName,
        roomCode,
        session_duration_ms:
          now.getTime() - existingSession.sessionStart.getTime(),
        reconnection_count: existingSession.reconnections,
        votes_cast: existingSession.votesCast,
        correlation_id: correlationId,
      });
    } else {
      // Create new session
      const session: UserSession = {
        userId,
        userName,
        socketId,
        roomCode,
        sessionStart: now,
        lastActivity: now,
        joinCount: 1,
        votesCast: 0,
        reconnections: 0,
        correlationId,
      };

      this.sessions.set(userId, session);

      logger.logBusinessMetric("User session started", {
        userId,
        userName,
        roomCode,
        total_active_sessions: this.sessions.size,
        correlation_id: correlationId,
      });
    }
  }

  /**
   * Update session activity (vote, room change, etc.)
   */
  updateActivity(
    userId: string,
    activityType: "vote" | "room_change" | "general",
  ): void {
    const session = this.sessions.get(userId);
    if (!session) return;

    session.lastActivity = new Date();

    if (activityType === "vote") {
      session.votesCast++;
    }
  }

  /**
   * End a user session and log metrics
   */
  endSession(userId: string, reason: string = "disconnect"): void {
    const session = this.sessions.get(userId);
    if (!session) return;

    const sessionEnd = new Date();
    const sessionDuration =
      sessionEnd.getTime() - session.sessionStart.getTime();
    const inactiveTime = sessionEnd.getTime() - session.lastActivity.getTime();

    // Log detailed session metrics
    logger.logBusinessMetric("User session ended", {
      userId: session.userId,
      userName: session.userName,
      roomCode: session.roomCode,
      session_duration_ms: sessionDuration,
      session_duration_minutes: Math.floor(sessionDuration / 60000),
      inactive_time_ms: inactiveTime,
      votes_cast: session.votesCast,
      join_count: session.joinCount,
      reconnection_count: session.reconnections,
      end_reason: reason,
      engagement_score: this.calculateEngagementScore(session, sessionDuration),
      remaining_sessions: this.sessions.size - 1,
      correlation_id: session.correlationId,
    });

    this.sessions.delete(userId);
  }

  /**
   * Calculate engagement score based on session metrics
   */
  private calculateEngagementScore(
    session: UserSession,
    durationMs: number,
  ): number {
    // Simple engagement score: (votes per minute) + (connection stability bonus)
    const durationMinutes = durationMs / 60000;
    const votesPerMinute =
      durationMinutes > 0 ? session.votesCast / durationMinutes : 0;
    const stabilityBonus = session.reconnections < 2 ? 1 : 0.5; // Penalize excessive reconnections

    return Math.round((votesPerMinute * 10 + stabilityBonus) * 100) / 100;
  }

  /**
   * Get current session statistics
   */
  getSessionStatistics(): {
    totalActiveSessions: number;
    averageSessionDuration: number;
    totalVotesCast: number;
    highEngagementSessions: number;
  } {
    const now = new Date().getTime();
    let totalDuration = 0;
    let totalVotes = 0;
    let highEngagement = 0;

    for (const session of this.sessions.values()) {
      const duration = now - session.sessionStart.getTime();
      totalDuration += duration;
      totalVotes += session.votesCast;

      if (this.calculateEngagementScore(session, duration) > 5) {
        highEngagement++;
      }
    }

    return {
      totalActiveSessions: this.sessions.size,
      averageSessionDuration:
        this.sessions.size > 0 ? totalDuration / this.sessions.size : 0,
      totalVotesCast: totalVotes,
      highEngagementSessions: highEngagement,
    };
  }

  /**
   * Log periodic session statistics
   */
  logSessionStatistics(): void {
    const stats = this.getSessionStatistics();

    logger.logBusinessMetric("Session statistics snapshot", {
      active_sessions: stats.totalActiveSessions,
      average_session_duration_ms: Math.round(stats.averageSessionDuration),
      average_session_duration_minutes: Math.round(
        stats.averageSessionDuration / 60000,
      ),
      total_votes_cast: stats.totalVotesCast,
      high_engagement_sessions: stats.highEngagementSessions,
      engagement_rate:
        stats.totalActiveSessions > 0
          ? Math.round(
              (stats.highEngagementSessions / stats.totalActiveSessions) * 100,
            ) / 100
          : 0,
    });
  }

  /**
   * Cleanup stale sessions (for sessions that didn't properly disconnect)
   */
  cleanupStaleSessions(): void {
    const now = new Date().getTime();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [userId, session] of this.sessions.entries()) {
      const inactiveTime = now - session.lastActivity.getTime();

      if (inactiveTime > staleThreshold) {
        logger.logSystemEvent("Cleaning up stale session", "room_cleanup", {
          userId: session.userId,
          roomCode: session.roomCode,
          inactive_time_ms: inactiveTime,
          session_duration_ms: now - session.sessionStart.getTime(),
        });

        this.endSession(userId, "stale_cleanup");
      }
    }
  }
}

export default new SessionTrackingService();
