# SLAM Poker Grafana Dashboards

This directory contains comprehensive Grafana dashboard JSON files for monitoring the SLAM Poker application. These dashboards are designed to work with the Prometheus metrics exposed by the application at `/metrics`.

## Dashboard Overview

### 1. Overview Dashboard (`slam-poker-overview.json`)
**High-level KPIs and system overview**
- Active rooms, users, and sessions
- System health score
- Room creation and user join rates
- WebSocket connection activity
- HTTP request metrics
- Error rate monitoring

### 2. Room Analytics Dashboard (`slam-poker-room-analytics.json`)
**Room-specific metrics and user behavior**
- Peak users by room
- Votes cast per room
- Room lifecycle events (created, joined, left, voting started, votes revealed)
- Voting round duration analysis
- Total votes cast by room (table view)

### 3. Performance Dashboard (`slam-poker-performance.json`)
**Latency and performance metrics**
- HTTP request duration percentiles (50th, 90th, 95th, 99th)
- WebSocket event processing duration
- Session duration analysis
- Request rate by endpoint
- Performance heatmaps

### 4. System Health Dashboard (`slam-poker-system-health.json`)
**Infrastructure and Node.js system metrics**
- Memory usage (resident, heap, external heap)
- CPU usage (user, system)
- Event loop lag
- Garbage collection metrics
- Error rates by category
- HTTP status code distribution
- File descriptors and process uptime

### 5. Alerts & SLA Dashboard (`slam-poker-alerts-sla.json`)
**SLA monitoring and alerting**
- HTTP success rate (SLA: 99.9%)
- Average response time (SLA: <100ms)
- Error rate (SLA: <0.1%)
- Critical alert status
- Memory and CPU usage alerts
- WebSocket connection health
- Room capacity monitoring
- SLA compliance over time

## Prerequisites

1. **Prometheus**: Your application must be exposing metrics at `/metrics` endpoint
2. **Grafana**: Version 8.0+ recommended
3. **Prometheus Data Source**: Configure Grafana to connect to your Prometheus instance

## Importing Dashboards

### Method 1: Grafana UI
1. Open Grafana web interface
2. Navigate to **"+"** → **"Import"**
3. Click **"Upload JSON file"** or paste the JSON content
4. Select your Prometheus data source
5. Click **"Import"**

### Method 2: Grafana API
```bash
# Example for Overview dashboard
curl -X POST \
  http://your-grafana-instance/api/dashboards/db \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d @slam-poker-overview.json
```

### Method 3: Grafana CLI (if you have file access)
```bash
# Copy dashboards to Grafana provisioning directory
sudo cp *.json /etc/grafana/provisioning/dashboards/
sudo systemctl restart grafana-server
```

## Prometheus Configuration

Ensure your `prometheus.yml` includes a scrape config for SLAM Poker:

```yaml
scrape_configs:
  - job_name: 'slam-poker'
    static_configs:
      - targets: ['localhost:3001']  # Your app's host:port
    metrics_path: '/metrics'
    scrape_interval: 15s
```

## Key Metrics Tracked

### Gauges (Current State)
- `slam_poker_active_rooms` - Currently active rooms
- `slam_poker_active_users` - Currently active users
- `slam_poker_active_sessions` - Currently active sessions
- `slam_poker_system_health_score` - Overall system health (0-100)
- `slam_poker_peak_users_in_room{room_code}` - Peak users per room

### Counters (Totals)
- `slam_poker_rooms_created_total` - Total rooms created
- `slam_poker_user_joins_total` - Total user joins
- `slam_poker_votes_cast_total{room_code}` - Total votes cast
- `slam_poker_websocket_connections_total{event_type}` - WebSocket events
- `slam_poker_http_requests_total{method,path,status_code}` - HTTP requests
- `slam_poker_errors_total{error_category}` - Application errors

### Histograms (Distributions)
- `slam_poker_http_request_duration_seconds` - HTTP latency
- `slam_poker_websocket_event_duration_seconds` - WebSocket processing time
- `slam_poker_session_duration_seconds` - User session duration
- `slam_poker_voting_round_duration_seconds` - Voting round duration

### Node.js System Metrics (prefixed with `slam_poker_`)
- Process memory usage
- CPU utilization
- Event loop lag
- Garbage collection
- File descriptors

## Alert Rules

Consider setting up these Prometheus alert rules:

```yaml
groups:
  - name: slam-poker-alerts
    rules:
      - alert: SLAMPokerHighErrorRate
        expr: rate(slam_poker_errors_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"

      - alert: SLAMPokerHighLatency
        expr: histogram_quantile(0.95, rate(slam_poker_http_request_duration_seconds_bucket[5m])) > 0.5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"

      - alert: SLAMPokerServiceDown
        expr: up{job="slam-poker"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "SLAM Poker service is down"
```

## Dashboard Variables

Some dashboards support template variables for filtering:
- `$room_code` - Filter by specific room code
- `$interval` - Adjustable time interval for rate calculations
- `$percentile` - Select which percentile to display

## Customization

Each dashboard can be customized:
- **Thresholds**: Adjust warning/critical thresholds in panel settings
- **Time ranges**: Modify default time ranges
- **Refresh rates**: Adjust auto-refresh intervals
- **Panels**: Add/remove/modify panels based on your needs

## Troubleshooting

### No Data Showing
1. Verify Prometheus is scraping your application
2. Check that metrics endpoint (`/metrics`) is accessible
3. Ensure data source configuration in Grafana is correct

### High Cardinality Warnings
If you have many rooms, consider:
- Adding recording rules for high-cardinality metrics
- Using label aggregation in queries
- Setting up metric retention policies

### Performance Issues
- Use recording rules for complex queries
- Reduce query ranges for heavy dashboards
- Consider downsampling for historical data

## Support

These dashboards are designed specifically for the SLAM Poker application's metrics schema. Modify queries and panels as needed for your specific monitoring requirements.