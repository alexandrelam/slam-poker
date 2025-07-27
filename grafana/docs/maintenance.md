# Dashboard Maintenance Guide

This guide covers ongoing maintenance, troubleshooting, and optimization of the SLAM Poker Grafana monitoring setup.

## 🔄 Regular Maintenance Tasks

### Daily Operations Checklist

#### Morning Health Check (5 minutes)

- [ ] **System Health Dashboard**: Verify all panels loading, no critical alerts
- [ ] **Active Alerts**: Review and acknowledge any overnight alerts
- [ ] **Error Rates**: Check error trends are within normal bounds
- [ ] **Performance Metrics**: Confirm response times and memory usage are stable

#### End of Day Review (10 minutes)

- [ ] **Business Intelligence**: Review daily usage patterns and anomalies
- [ ] **Capacity Planning**: Check resource utilization trends
- [ ] **Alert History**: Document any incidents and resolutions
- [ ] **Dashboard Performance**: Note any slow-loading panels

### Weekly Maintenance (30 minutes)

#### Monday - Planning Review

- [ ] **Capacity Trends**: Analyze weekly growth patterns
- [ ] **Alert Threshold Review**: Adjust based on baseline changes
- [ ] **Dashboard Performance**: Optimize slow queries
- [ ] **Documentation Updates**: Record any configuration changes

#### Wednesday - Deep Dive Analysis

- [ ] **Error Pattern Analysis**: Identify recurring issues
- [ ] **User Behavior Trends**: Review engagement and usage patterns
- [ ] **Performance Baselines**: Update benchmark expectations
- [ ] **Query Optimization**: Refine LogQL queries for efficiency

#### Friday - System Cleanup

- [ ] **Alert Noise Reduction**: Fine-tune overly sensitive alerts
- [ ] **Dashboard Cleanup**: Remove unused panels or dashboards
- [ ] **Template Variable Updates**: Ensure filters work correctly
- [ ] **Backup Configuration**: Export dashboard configurations

### Monthly Maintenance (2 hours)

#### Infrastructure Review

- [ ] **Loki Storage**: Monitor storage usage and retention policies
- [ ] **Grafana Performance**: Check database size and query performance
- [ ] **Alert Channel Testing**: Verify all notification channels
- [ ] **Security Updates**: Update Grafana and dependencies

#### Configuration Optimization

- [ ] **Query Performance**: Analyze and optimize slow-running queries
- [ ] **Dashboard Layout**: Review and improve dashboard UX
- [ ] **Alert Rule Effectiveness**: Measure alert accuracy and response times
- [ ] **Documentation Updates**: Keep runbooks and guides current

## 🛠 Troubleshooting Guide

### Common Issues and Solutions

#### No Data in Panels

**Symptoms:**

- Empty panels showing "No data"
- Time series charts not loading
- "Query returned no data" messages

**Diagnostics:**

```bash
# Check Loki connectivity
curl -G "http://your-loki-instance:3100/loki/api/v1/query" \
  --data-urlencode 'query={service="slam-poker"}' \
  --data-urlencode 'limit=10'

# Test LogQL query directly
{service="slam-poker"} | limit 10
```

**Solutions:**

1. **Verify Datasource Configuration**
   - Check Loki URL in datasource settings
   - Test datasource connection
   - Verify authentication if required

2. **Check Time Range**
   - Ensure time range includes periods with data
   - Verify timezone settings match log timestamps
   - Try absolute time ranges for testing

3. **Validate Query Syntax**
   - Test LogQL queries in Explore mode
   - Check for typos in service labels
   - Verify JSON field names match log structure

4. **Application Logging Issues**
   - Confirm SLAM Poker has `LOKI_ENABLED=true`
   - Check application logs for Loki connection errors
   - Verify log format matches expected JSON structure

#### Dashboard Performance Issues

**Symptoms:**

- Slow panel loading (>30 seconds)
- Browser timeout errors
- High CPU usage on Grafana server

**Diagnostics:**

```bash
# Check Grafana logs
tail -f /var/log/grafana/grafana.log | grep -i "slow\|timeout\|error"

# Monitor query performance in Grafana UI
# Navigate to: Configuration → Data Sources → Loki → Query Inspector
```

**Optimization Strategies:**

1. **Query Optimization**

   ```logql
   # Inefficient - scans all logs
   {service="slam-poker"} | json | duration_ms > 1000

   # Efficient - uses text filter first
   {service="slam-poker"} |= "duration_ms" | json | duration_ms > 1000
   ```

2. **Time Range Management**
   - Use shorter time ranges for high-frequency dashboards
   - Implement query caching for commonly accessed data
   - Set appropriate refresh intervals (avoid <10s for heavy queries)

3. **Panel Configuration**
   ```json
   {
     "maxDataPoints": 1000,    # Limit data points
     "interval": "30s",        # Set minimum interval
     "cacheTimeout": "5m"      # Enable caching
   }
   ```

#### Alert Issues

**Symptoms:**

- Alerts not firing when they should
- Too many false positive alerts
- Notification delivery failures

**Alert Debugging:**

1. **Check Alert Rule Status**
   - Navigate to Alerting → Alert Rules
   - Verify rule state (Normal, Pending, Firing)
   - Check evaluation frequency and conditions

2. **Test Alert Expressions**

   ```logql
   # Test alert condition in Explore
   {service="slam-poker"} |= "health_score" | json | unwrap health_score < 60

   # Verify data exists for time range
   count_over_time({service="slam-poker"} |= "health_score" [5m])
   ```

3. **Notification Channel Testing**

   ```bash
   # Test Slack webhook
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test alert from Grafana"}' \
     YOUR_SLACK_WEBHOOK_URL

   # Test email configuration
   # Use Grafana UI: Alerting → Contact Points → Test
   ```

### Performance Optimization

#### Query Performance Tips

1. **Use Label Filters Early**

   ```logql
   # Good - filters at source
   {service="slam-poker", level="error"}

   # Avoid - filters after log retrieval
   {service="slam-poker"} |= "level=error"
   ```

2. **Optimize Time Ranges**

   ```logql
   # Use rate interval variables
   rate({service="slam-poker"} [${__rate_interval}])

   # Set appropriate intervals
   rate({service="slam-poker"} [5m])  # For dashboards
   rate({service="slam-poker"} [1m])  # For alerts (shorter)
   ```

3. **Efficient Aggregations**

   ```logql
   # Group by relevant labels only
   sum by (error_category) (
     rate({service="slam-poker"} |= "error" [5m])
   )

   # Limit cardinality
   topk(10, count by (userId) ({service="slam-poker"}))
   ```

#### Dashboard Optimization

1. **Panel Configuration**
   - Set appropriate max data points (500-2000)
   - Use legends selectively (hide when not needed)
   - Implement panel linking for drill-down navigation

2. **Template Variables**

   ```json
   {
     "refresh": 1,           # Refresh on time range change
     "options": [],
     "query": "label_values(service)",
     "includeAll": false,
     "multi": false
   }
   ```

3. **Layout Optimization**
   - Group related panels logically
   - Use consistent panel sizes (h: 8, w: 12 standard)
   - Implement row folding for less critical metrics

## 🔍 Monitoring Dashboard Health

### Key Performance Indicators

#### Dashboard Responsiveness

- **Target:** <5 seconds average panel load time
- **Warning:** >10 seconds load time
- **Critical:** >30 seconds or timeouts

#### Query Efficiency

- **Target:** <100ms query execution time
- **Warning:** >500ms execution time
- **Critical:** >2s execution time

#### Data Freshness

- **Target:** <30 seconds lag from log generation
- **Warning:** >2 minutes lag
- **Critical:** >5 minutes lag

### Health Monitoring Queries

```logql
# Monitor Grafana query performance
{job="grafana"} |= "query" |= "took" | json | unwrap took > 1000

# Check Loki ingestion lag
{job="loki"} |= "ingester" |= "lag" | json | unwrap lag > 30

# Monitor dashboard access patterns
{job="grafana"} |= "dashboard" |= "view" | json
```

## 🚨 Incident Response Procedures

### Critical Alert Response (0-15 minutes)

1. **Acknowledge Alert**
   - Silence alert to prevent spam
   - Notify team via primary communication channel
   - Open incident tracking ticket

2. **Initial Assessment**
   - Check System Health dashboard
   - Review Error Analysis dashboard
   - Identify affected services/features

3. **Immediate Actions**
   - Follow relevant runbook procedures
   - Implement immediate mitigation if known
   - Escalate if root cause unclear

### Investigation Phase (15-60 minutes)

1. **Correlation Analysis**
   - Use Correlation ID tracing
   - Check related systems and dependencies
   - Review recent deployments or changes

2. **Impact Assessment**
   - Monitor Business Intelligence metrics
   - Check user-facing functionality
   - Assess data integrity concerns

3. **Communication**
   - Update stakeholders on progress
   - Document findings and actions taken
   - Coordinate with development teams

### Resolution and Follow-up (1+ hours)

1. **Implementation**
   - Apply fix or workaround
   - Monitor metrics for improvement
   - Verify full service restoration

2. **Post-Incident Review**
   - Document root cause analysis
   - Identify monitoring gaps
   - Update alert thresholds if needed
   - Improve runbook procedures

## 📊 Dashboard Version Control

### Configuration Backup

```bash
# Export dashboard JSON
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  "http://grafana:3000/api/dashboards/uid/slam-poker-system-health" \
  > system-health-backup.json

# Export all dashboards
for uid in $(curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  "http://grafana:3000/api/search?type=dash-db" | jq -r '.[].uid'); do
  curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
    "http://grafana:3000/api/dashboards/uid/$uid" \
    > "dashboard-$uid-$(date +%Y%m%d).json"
done
```

### Change Management

1. **Before Making Changes**
   - Export current dashboard configuration
   - Document change rationale
   - Test changes in non-production environment

2. **Change Implementation**
   - Make incremental changes
   - Test each modification
   - Update documentation accordingly

3. **Post-Change Validation**
   - Verify all panels load correctly
   - Test alert conditions still work
   - Monitor performance impact

## 🔧 Automation Scripts

### Dashboard Health Check Script

```bash
#!/bin/bash
# dashboard-health-check.sh

GRAFANA_URL="http://grafana:3000"
API_KEY="your-api-key"

echo "Checking dashboard health..."

# Check datasource connectivity
curl -s -H "Authorization: Bearer $API_KEY" \
  "$GRAFANA_URL/api/datasources" | jq '.[] | select(.name == "Loki") | .id'

# Test critical dashboards
DASHBOARDS=("slam-poker-system-health" "slam-poker-error-analysis")

for dashboard in "${DASHBOARDS[@]}"; do
  echo "Testing dashboard: $dashboard"
  curl -s -H "Authorization: Bearer $API_KEY" \
    "$GRAFANA_URL/api/dashboards/uid/$dashboard" > /dev/null
  if [ $? -eq 0 ]; then
    echo "✅ $dashboard - OK"
  else
    echo "❌ $dashboard - FAILED"
  fi
done
```

### Alert Rule Validation

```bash
#!/bin/bash
# validate-alerts.sh

echo "Validating alert rules..."

# Check alert rule status
curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
  "$GRAFANA_URL/api/v1/provisioning/alert-rules" | \
  jq '.[] | select(.noDataState == "NoData" or .execErrState == "Alerting") | .title'

echo "Alert validation complete"
```

## 📋 Maintenance Schedule Template

### Daily (Automated)

- Dashboard health check script
- Alert rule validation
- Performance metrics collection

### Weekly (Manual)

- Dashboard performance review
- Alert threshold adjustment
- Query optimization review

### Monthly (Planned)

- Configuration backup
- Documentation updates
- Training session for team

### Quarterly (Strategic)

- Dashboard architecture review
- Monitoring strategy assessment
- Tool evaluation and upgrades

---

**Remember:** Regular maintenance prevents major issues. Stay proactive with monitoring your monitoring tools!

For additional support, contact the platform team or refer to the main [README.md](README.md) for setup guidance.
