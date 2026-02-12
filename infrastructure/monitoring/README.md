# PeptIQ Monitoring Configuration

## CloudWatch Alarms

Monitoring is configured via Terraform (see `infrastructure/terraform/main.tf`).

### Key Metrics Monitored

- **Database Connections** - Alert when connections exceed 80% of max
- **CPU Utilization** - Alert when ECS CPU > 80%
- **Sample Submission Count** - Business metric tracking
- **Report Generation Count** - Business metric tracking

### Application-Level Monitoring

Application metrics are tracked via custom CloudWatch metrics:

```bash
# Sample submission rate
aws cloudwatch put-metric-data \
  --namespace "PeptIQ" \
  --metric-name "SampleSubmissions" \
  --value 1

# Report generation time
aws cloudwatch put-metric-data \
  --namespace "PeptIQ" \
  --metric-name "ReportGenerationTime" \
  --value <seconds> \
  --unit Seconds
```

### Alerting

Alerts are configured to notify via:
- Slack (via webhook)
- Email (via SNS)

### Health Check Endpoints

- API: `GET /api/health`
- Web: `GET /api/health`
- Admin: `GET /api/health`
