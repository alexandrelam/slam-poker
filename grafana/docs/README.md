# SLAM Poker Grafana Monitoring Setup

This directory contains comprehensive Grafana dashboards and alerting configurations for monitoring the SLAM Poker application in production.

## 📊 Dashboard Overview

### 1. System Health & Performance

**File:** `dashboards/system-health.json`

- **Purpose:** Core infrastructure monitoring and system health tracking
- **Key Metrics:** System health score, error rates, HTTP performance, memory usage
- **Refresh Rate:** 10 seconds
- **Critical Alerts:** System health degradation, high error rates, performance issues

### 2. Application Metrics

**File:** `dashboards/application-metrics.json`

- **Purpose:** Application-specific business metrics and user engagement
- **Key Metrics:** Active rooms/users, voting patterns, engagement scores, session data
- **Refresh Rate:** 10 seconds
- **Use Cases:** Product decisions, feature adoption tracking, user behavior analysis

### 3. Operational Monitoring

**File:** `dashboards/operational-monitoring.json`

- **Purpose:** Real-time operational health and connection monitoring
- **Key Metrics:** WebSocket connections, traffic patterns, session lifecycle, client analytics
- **Refresh Rate:** 10 seconds
- **Use Cases:** Live operations, connection debugging, traffic analysis

### 4. Error Analysis & Debugging

**File:** `dashboards/error-analysis.json`

- **Purpose:** Comprehensive error tracking and debugging support
- **Key Metrics:** Error categorization, correlation tracing, spike detection, failure analysis
- **Refresh Rate:** 10 seconds
- **Use Cases:** Troubleshooting, incident response, error pattern identification

### 5. Business Intelligence

**File:** `dashboards/business-intelligence.json`

- **Purpose:** Long-term usage trends and business insights
- **Key Metrics:** Usage patterns, growth trends, feature adoption, ROI metrics
- **Refresh Rate:** 30 seconds
- **Use Cases:** Strategic planning, growth analysis, product roadmap decisions

### 6. Capacity Planning

**File:** `dashboards/capacity-planning.json`

- **Purpose:** Infrastructure scaling and resource optimization
- **Key Metrics:** Resource utilization, growth projections, scaling indicators, efficiency metrics
- **Refresh Rate:** 1 minute
- **Use Cases:** Infrastructure planning, cost optimization, performance baselines

## 🚨 Alerting System

### Alert Categories

- **Critical (22 alerts):** Immediate response required, affects service availability
- **Warning (15 alerts):** Attention needed, potential service degradation
- **Business Critical (4 alerts):** Product/business impact, user experience affected

### Notification Channels

- **Slack:** Real-time alerts to relevant teams
- **PagerDuty:** Critical system alerts for on-call rotation
- **Email:** Alert summaries and escalations
- **Teams:** Business impact notifications
- **Webhook:** Custom integrations and automation

## 🛠 Setup Instructions

### Prerequisites

- Grafana 10.0+
- Loki datasource configured and accessible
- SLAM Poker application with enhanced logging enabled

### 1. Environment Configuration

Update your environment variables:

```bash
# Loki Configuration
LOKI_URL=http://your-loki-instance:3100
LOKI_ENABLED=true

# Alert Notification Channels
SLACK_WEBHOOK_URL_CRITICAL=https://hooks.slack.com/services/YOUR/CRITICAL/WEBHOOK
SLACK_WEBHOOK_URL_WARNINGS=https://hooks.slack.com/services/YOUR/WARNING/WEBHOOK
SLACK_WEBHOOK_URL_BUSINESS=https://hooks.slack.com/services/YOUR/BUSINESS/WEBHOOK
SLACK_WEBHOOK_URL_ENGINEERING=https://hooks.slack.com/services/YOUR/ENGINEERING/WEBHOOK
PAGERDUTY_INTEGRATION_KEY=your-pagerduty-key
TEAMS_WEBHOOK_URL=https://your-org.webhook.office.com/webhookb2/your-teams-webhook
DEFAULT_WEBHOOK_URL=https://your-custom-webhook-endpoint.com/alerts
```

### 2. Grafana Configuration

#### Option A: Manual Import

1. Copy dashboard JSON files from `dashboards/` directory
2. Import each dashboard in Grafana UI (+ → Import)
3. Configure datasource to point to your Loki instance
4. Set up notification channels in Alerting → Contact Points
5. Import alerting rules from `alerting/rules.yml`

#### Option B: Provisioning (Recommended)

1. Copy provisioning files to your Grafana provisioning directory:

   ```bash
   cp provisioning/datasource.yml /etc/grafana/provisioning/datasources/
   cp provisioning/dashboard.yml /etc/grafana/provisioning/dashboards/
   cp dashboards/*.json /var/lib/grafana/dashboards/
   cp alerting/rules.yml /etc/grafana/provisioning/alerting/
   cp alerting/notifications.yml /etc/grafana/provisioning/alerting/
   ```

2. Restart Grafana service:
   ```bash
   sudo systemctl restart grafana-server
   ```

### 3. Verification

1. **Datasource:** Verify Loki connection in Configuration → Data Sources
2. **Dashboards:** Check all 6 dashboards load without errors
3. **Alerts:** Confirm alert rules are active in Alerting → Alert Rules
4. **Notifications:** Test notification channels work correctly

## 📈 Dashboard Usage Guide

### Template Variables

All dashboards include template variables for filtering:

- **Service:** Filter by service name (default: slam-poker)
- **Environment:** Filter by deployment environment (production, staging, etc.)
- **Time Range:** Adjust observation window
- **Custom Filters:** Dashboard-specific filters (room codes, correlation IDs, etc.)

### Key Features

- **Correlation ID Tracing:** Click correlation IDs to trace requests across logs
- **Drill-down Navigation:** Click metrics to explore related data
- **Alert Integration:** Visual indicators when alerts are firing
- **Auto-refresh:** Real-time data updates for operational monitoring

### Best Practices

- **System Health:** Monitor continuously during business hours
- **Error Analysis:** Check after deployments and during incidents
- **Business Intelligence:** Review weekly for trends and insights
- **Capacity Planning:** Monitor daily, plan monthly infrastructure changes

## 🔧 Customization

### Adding New Panels

1. Create LogQL queries using the patterns in `queries.md`
2. Follow existing dashboard naming conventions
3. Include appropriate thresholds and alert conditions
4. Document new metrics in this README

### Modifying Alerts

1. Update `alerting/rules.yml` with new conditions
2. Test alert expressions using Grafana explore mode
3. Configure appropriate notification routing
4. Document alert purpose and response procedures

### Environment-Specific Tuning

- **Development:** Increase refresh rates, reduce alert sensitivity
- **Staging:** Mirror production settings for testing
- **Production:** Optimize for performance, strict alert thresholds

## 📋 Maintenance Tasks

### Daily

- [ ] Check System Health dashboard for anomalies
- [ ] Review active alerts and resolve as needed
- [ ] Monitor capacity metrics for scaling needs

### Weekly

- [ ] Review Business Intelligence trends
- [ ] Update alert thresholds based on usage patterns
- [ ] Clean up resolved alert noise

### Monthly

- [ ] Analyze Error Analysis patterns for improvements
- [ ] Review Capacity Planning projections
- [ ] Update documentation for dashboard changes
- [ ] Performance tune queries for efficiency

## 🆘 Troubleshooting

### Common Issues

**No Data in Dashboards**

- Verify Loki datasource configuration
- Check SLAM Poker logging is enabled (`LOKI_ENABLED=true`)
- Confirm time range includes data periods
- Validate LogQL query syntax

**Alerts Not Firing**

- Check alert rule expressions in Grafana
- Verify notification channel configurations
- Test webhook endpoints and API keys
- Review alert evaluation frequency settings

**Poor Dashboard Performance**

- Optimize LogQL queries using indexes
- Reduce refresh rates during high load
- Implement query result caching
- Consider log retention policies

**Missing Metrics**

- Ensure application logging includes required metadata
- Check log ingestion pipeline for errors
- Verify Loki label extraction rules
- Review dashboard variable filters

### Support Contacts

- **Infrastructure Issues:** ops-team@company.com
- **Dashboard Problems:** engineering-lead@company.com
- **Business Metrics Questions:** product-team@company.com

## 📚 Additional Resources

- [LogQL Query Examples](queries.md)
- [Dashboard Maintenance Guide](maintenance.md)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [SLAM Poker Application Logs Guide](../CLAUDE.md)

---

**Created:** January 2025  
**Version:** 1.0  
**Last Updated:** January 2025  
**Maintainer:** Engineering Team
