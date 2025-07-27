# LogQL Query Reference for SLAM Poker

This document provides LogQL query examples and patterns for monitoring SLAM Poker application logs in Grafana.

## 📚 Basic Query Patterns

### Log Stream Selection

```logql
# Basic service filter
{service="slam-poker"}

# Environment filtering
{service="slam-poker", environment="production"}

# Multiple label filtering
{service="slam-poker", environment="production"} |= "error"
```

### Text Filtering

```logql
# Contains text
{service="slam-poker"} |= "error"

# Does not contain text
{service="slam-poker"} != "health check"

# Regex matching
{service="slam-poker"} |~ "error|ERROR|Error"

# Case insensitive regex
{service="slam-poker"} |~ "(?i)error"
```

## 🔍 JSON Log Processing

### Basic JSON Extraction

```logql
# Extract JSON fields
{service="slam-poker"} | json

# Extract specific JSON field
{service="slam-poker"} | json | correlation_id != ""

# Extract and filter by JSON field
{service="slam-poker"} | json | error_category = "system_error"
```

### Complex JSON Filtering

```logql
# Multiple JSON field filters
{service="slam-poker"} | json
| error_category != ""
| operation_type = "websocket_connect"
| duration_ms > 1000

# JSON field regex matching
{service="slam-poker"} | json
| userId =~ "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"
```

## 📊 Metrics Queries

### Rate Calculations

```logql
# Basic rate
rate({service="slam-poker"} |= "error" [5m])

# Rate with filtering
rate({service="slam-poker"} |= "HTTP request completed" | json | status_code = "200" [5m])

# Error rate percentage
rate({service="slam-poker"} |= "error" [5m]) /
rate({service="slam-poker"} [5m]) * 100
```

### Counting Operations

```logql
# Count logs over time
count_over_time({service="slam-poker"} |= "User session started" [1h])

# Count unique values
count by (userId) ({service="slam-poker"} |= "User session started" | json)

# Sum numeric values
sum(rate({service="slam-poker"} |= "memory_usage_mb" | json | unwrap memory_usage_mb [5m]))
```

### Aggregations

```logql
# Average numeric field
avg_over_time({service="slam-poker"} |= "duration_ms" | json | unwrap duration_ms [5m])

# Max/Min values
max_over_time({service="slam-poker"} |= "memory_usage_mb" | json | unwrap memory_usage_mb [1h])
min_over_time({service="slam-poker"} |= "response_time_ms" | json | unwrap response_time_ms [5m])

# Percentiles
quantile_over_time(0.95, {service="slam-poker"} |= "duration_ms" | json | unwrap duration_ms [5m])
```

## 🚨 Error Monitoring Queries

### Error Rate Tracking

```logql
# Overall error rate
rate({service="slam-poker"} |= "error_category" [5m])

# Error rate by category
sum by (error_category) (
  rate({service="slam-poker"} |= "error_category" | json | error_category != "" [5m])
)

# HTTP error rates
rate({service="slam-poker"} |= "HTTP request failed" | json | status_code =~ "5[0-9][0-9]" [5m])
```

### Error Analysis

```logql
# Top error messages
topk(10, count by (message) (
  {service="slam-poker"} |= "error" | json
))

# Errors by user
count by (userId) (
  {service="slam-poker"} |= "error_category" | json | userId != ""
)

# Error correlation tracking
{service="slam-poker"} |= "correlation_id" | json
| correlation_id = "specific-correlation-id"
```

## 🔗 WebSocket & Connection Queries

### Connection Monitoring

```logql
# WebSocket connection rate
rate({service="slam-poker"} |= "WebSocket connection established" [5m])

# Disconnection rate
rate({service="slam-poker"} |= "WebSocket connection closed" [5m])

# Connection duration
avg_over_time({service="slam-poker"} |= "session_duration_ms" | json | unwrap session_duration_ms [10m])
```

### Connection Health

```logql
# Disconnect reasons
count by (disconnect_reason) (
  {service="slam-poker"} |= "WebSocket connection closed" | json | disconnect_reason != ""
)

# Reconnection patterns
rate({service="slam-poker"} |= "User session reconnected" [5m])

# Client analysis
count by (user_agent) (
  {service="slam-poker"} |= "WebSocket connection established" | json | user_agent != ""
)
```

## 🏠 Room & User Analytics

### Room Operations

```logql
# Room creation rate
rate({service="slam-poker"} |= "Room created" [5m])

# Room utilization
avg_over_time({service="slam-poker"} |= "room_size" | json | unwrap room_size [10m])

# Voting completion rates
avg_over_time({service="slam-poker"} |= "voting_completion_rate" | json | unwrap voting_completion_rate [15m])
```

### User Engagement

```logql
# Active user count
count by (userId) (
  {service="slam-poker"} |= "User session started" | json | userId != ""
)

# Engagement scores
avg_over_time({service="slam-poker"} |= "engagement_score" | json | unwrap engagement_score [1h])

# Vote casting patterns
rate({service="slam-poker"} |= "Vote cast" [5m])
```

## 📈 Performance Monitoring

### Response Time Analysis

```logql
# HTTP response time percentiles
quantile_over_time(0.50, {service="slam-poker"} |= "HTTP request completed" | json | unwrap duration_ms [5m])
quantile_over_time(0.95, {service="slam-poker"} |= "HTTP request completed" | json | unwrap duration_ms [5m])
quantile_over_time(0.99, {service="slam-poker"} |= "HTTP request completed" | json | unwrap duration_ms [5m])

# Slow requests
{service="slam-poker"} |= "HTTP request completed" | json | duration_ms > 2000
```

### System Resource Monitoring

```logql
# Memory usage trends
avg_over_time({service="slam-poker"} |= "memory_usage_mb" | json | unwrap memory_usage_mb [5m])

# System health score
avg_over_time({service="slam-poker"} |= "health_score" | json | unwrap health_score [5m])
```

## 🔧 Advanced Query Patterns

### Correlation ID Tracing

```logql
# Find all logs for specific correlation ID
{service="slam-poker"} |= "correlation_id" | json
| correlation_id = "abc123-def456-ghi789"

# Trace request flow
{service="slam-poker"} |= "correlation_id" | json
| correlation_id = "abc123-def456-ghi789"
| line_format "{{.timestamp}} | {{.operation_type}} | {{.message}}"
```

### Business Intelligence Queries

```logql
# Daily active users
count by (day) (
  sum by (userId) (
    count_over_time({service="slam-poker"} |= "User session started" | json | userId != "" [1d])
  )
)

# Feature adoption rates
count by (creation_method) (
  {service="slam-poker"} |= "Room created" | json | creation_method != ""
)

# User retention metrics
rate({service="slam-poker"} |= "User session reconnected" [1h]) /
rate({service="slam-poker"} |= "User session started" [1h])
```

### Capacity Planning Queries

```logql
# Growth rate prediction
predict_linear(
  avg_over_time({service="slam-poker"} |= "total_active_users" | json | unwrap total_active_users [2h]),
  3600
)

# Resource efficiency
avg_over_time({service="slam-poker"} |= "total_active_users" | json | unwrap total_active_users [5m]) /
avg_over_time({service="slam-poker"} |= "memory_usage_mb" | json | unwrap memory_usage_mb [5m])
```

## 🎯 Alert Query Examples

### System Health Alerts

```logql
# Critical system health
{service="slam-poker"} |= "health_score" | json | unwrap health_score < 60

# High error rate
rate({service="slam-poker"} |= "error_category" [5m]) > 0.1

# Memory usage alert
{service="slam-poker"} |= "memory_usage_mb" | json | unwrap memory_usage_mb > 1024
```

### Performance Alerts

```logql
# High response time
quantile_over_time(0.95, {service="slam-poker"} |= "HTTP request completed" | json | unwrap duration_ms [5m]) > 2000

# WebSocket connection issues
rate({service="slam-poker"} |= "WebSocket connection closed" [5m]) /
rate({service="slam-poker"} |= "WebSocket connection established" [5m]) > 0.5
```

### Business Critical Alerts

```logql
# No active users
{service="slam-poker"} |= "total_active_users" | json | unwrap total_active_users == 0

# Low voting completion
{service="slam-poker"} |= "voting_completion_rate" | json | unwrap voting_completion_rate < 70

# Service availability
absent_over_time({service="slam-poker"} |= "SLAM Poker server initialized" [5m])
```

## 🛠 Query Optimization Tips

### Performance Best Practices

```logql
# Use specific time ranges
{service="slam-poker"} |= "error" [5m]  # Good
{service="slam-poker"} |= "error"       # Avoid - scans all logs

# Filter early in pipeline
{service="slam-poker"} |= "error" | json | error_category != ""  # Good
{service="slam-poker"} | json | error_category != "" |= "error"  # Less efficient

# Use indexes effectively
{service="slam-poker", level="error"}  # Good - uses label index
{service="slam-poker"} |= "level=error"  # Less efficient - full text search
```

### Debugging Queries

```logql
# Validate JSON parsing
{service="slam-poker"} | json | __error__ != ""

# Check log volume
count_over_time({service="slam-poker"} [1h])

# Inspect raw logs
{service="slam-poker"} | limit 10
```

## 📋 Query Templates

### Template Variables in Queries

```logql
# Using Grafana template variables
{service="$service", environment="$environment"} |= "$search_term"

# Time range variables
rate({service="$service"} |= "error" [$__rate_interval])

# Multi-value variables
{service="slam-poker"} |= "roomCode" | json | roomCode =~ "$roomCode"
```

### Reusable Query Patterns

```logql
# Error rate template
rate({service="$service"} |= "$error_type" | json | error_category = "$category" [$__rate_interval])

# Performance monitoring template
quantile_over_time($percentile, {service="$service"} |= "$metric_name" | json | unwrap $field_name [$__rate_interval])

# Business metrics template
avg_over_time({service="$service"} |= "$business_event" | json | unwrap $metric_field [$__rate_interval])
```

---

**Note:** Replace placeholder values (`$service`, `$environment`, etc.) with actual values or Grafana template variables when using these queries in dashboards.

For more LogQL documentation, visit: [Grafana Loki LogQL Documentation](https://grafana.com/docs/loki/latest/logql/)
