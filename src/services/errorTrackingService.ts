import logger, { ErrorCategory, OperationType } from "@/utils/logger";
import metricsService from "@/services/metricsService";

interface ErrorMetrics {
  category: ErrorCategory;
  operationType: OperationType;
  count: number;
  lastOccurrence: Date;
}

/**
 * Service for tracking error rates and system health metrics
 * Provides aggregated error data for Grafana alerting and monitoring
 */
class ErrorTrackingService {
  private errorCounts: Map<string, ErrorMetrics> = new Map();
  private hourlyErrorCounts: Map<string, number> = new Map();
  private lastHourlyReset = new Date();

  /**
   * Record an error occurrence
   */
  recordError(
    category: ErrorCategory,
    operationType: OperationType,
    userId?: string,
    roomCode?: string,
    additionalContext: Record<string, any> = {},
  ): void {
    const key = `${category}-${operationType}`;
    const now = new Date();

    // Update error metrics
    const existing = this.errorCounts.get(key);
    if (existing) {
      existing.count++;
      existing.lastOccurrence = now;
    } else {
      this.errorCounts.set(key, {
        category,
        operationType,
        count: 1,
        lastOccurrence: now,
      });
    }

    // Track error in Prometheus metrics
    metricsService.incrementErrors(category);

    // Update hourly counts
    const hourlyKey = `${Math.floor(now.getTime() / (60 * 60 * 1000))}`;
    this.hourlyErrorCounts.set(
      hourlyKey,
      (this.hourlyErrorCounts.get(hourlyKey) || 0) + 1,
    );

    // Check for error rate spikes
    this.checkErrorRateSpikes(category, operationType);

    // Log business metric for error tracking
    logger.logBusinessMetric("Error occurred", {
      error_category: category,
      operation_type: operationType,
      userId,
      roomCode,
      total_errors_this_type: existing ? existing.count + 1 : 1,
      errors_last_hour: this.getErrorsInLastHour(),
      ...additionalContext,
    });
  }

  /**
   * Check for error rate spikes and alert if necessary
   */
  private checkErrorRateSpikes(
    category: ErrorCategory,
    operationType: OperationType,
  ): void {
    const recentErrors = this.getErrorsInLastHour();
    const errorRateThreshold = 50; // errors per hour

    if (recentErrors > errorRateThreshold) {
      logger.logError("High error rate detected", null, "system_error", {
        errors_last_hour: recentErrors,
        threshold: errorRateThreshold,
        recent_error_category: category,
        recent_operation_type: operationType,
        alert_level: "critical",
      });
    }
  }

  /**
   * Get error count for the last hour
   */
  private getErrorsInLastHour(): number {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const currentHour = Math.floor(now.getTime() / (60 * 60 * 1000));
    const previousHour = Math.floor(oneHourAgo.getTime() / (60 * 60 * 1000));

    return (
      (this.hourlyErrorCounts.get(currentHour.toString()) || 0) +
      (this.hourlyErrorCounts.get(previousHour.toString()) || 0)
    );
  }

  /**
   * Get comprehensive error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsLastHour: number;
    topErrorCategories: Array<{ category: ErrorCategory; count: number }>;
    topErrorOperations: Array<{ operation: OperationType; count: number }>;
    errorRate: number; // errors per minute
  } {
    let totalErrors = 0;
    const categoryMap = new Map<ErrorCategory, number>();
    const operationMap = new Map<OperationType, number>();

    for (const metrics of this.errorCounts.values()) {
      totalErrors += metrics.count;
      categoryMap.set(
        metrics.category,
        (categoryMap.get(metrics.category) || 0) + metrics.count,
      );
      operationMap.set(
        metrics.operationType,
        (operationMap.get(metrics.operationType) || 0) + metrics.count,
      );
    }

    const topCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    const topOperations = Array.from(operationMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([operation, count]) => ({ operation, count }));

    const errorsLastHour = this.getErrorsInLastHour();
    const errorRate = errorsLastHour / 60; // per minute

    return {
      totalErrors,
      errorsLastHour,
      topErrorCategories: topCategories,
      topErrorOperations: topOperations,
      errorRate,
    };
  }

  /**
   * Log periodic error statistics
   */
  logErrorStatistics(): void {
    const stats = this.getErrorStatistics();

    logger.logBusinessMetric("Error statistics snapshot", {
      total_errors: stats.totalErrors,
      errors_last_hour: stats.errorsLastHour,
      error_rate_per_minute: Math.round(stats.errorRate * 100) / 100,
      top_error_category: stats.topErrorCategories[0]?.category || "none",
      top_error_operation: stats.topErrorOperations[0]?.operation || "none",
      unique_error_types: this.errorCounts.size,
    });

    // Log individual top errors for detailed analysis
    stats.topErrorCategories.forEach((item, index) => {
      if (index < 3) {
        // Top 3 only
        logger.logBusinessMetric(`Top error category #${index + 1}`, {
          error_category: item.category,
          error_count: item.count,
          rank: index + 1,
        });
      }
    });
  }

  /**
   * Cleanup old error data (keep last 24 hours)
   */
  cleanupOldErrors(): void {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const cutoffHour = Math.floor(
      twentyFourHoursAgo.getTime() / (60 * 60 * 1000),
    );

    // Clean up hourly counts
    for (const [hourKey] of this.hourlyErrorCounts.entries()) {
      if (parseInt(hourKey) < cutoffHour) {
        this.hourlyErrorCounts.delete(hourKey);
      }
    }

    // Clean up old error entries (keep metrics but reset if very old)
    for (const [key, metrics] of this.errorCounts.entries()) {
      if (metrics.lastOccurrence < twentyFourHoursAgo) {
        this.errorCounts.delete(key);
      }
    }
  }

  /**
   * Get system health score based on error rates
   */
  getSystemHealthScore(): number {
    const stats = this.getErrorStatistics();
    const baseScore = 100;

    // Deduct points for high error rates
    const errorRatePenalty = Math.min(stats.errorRate * 5, 50); // Max 50 point penalty
    const recentErrorsPenalty = Math.min(stats.errorsLastHour / 10, 30); // Max 30 point penalty

    return Math.max(0, baseScore - errorRatePenalty - recentErrorsPenalty);
  }
}

export default new ErrorTrackingService();
