# PeptIQ Database Backup Configuration

## Automated Backups

RDS automated backups are configured with:
- **Retention Period**: 14 days
- **Backup Window**: 03:00-04:00 UTC daily
- **Encryption**: AES-256

## Manual Backup Script

```bash
#!/bin/bash
# Manual database backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="peptiq_backup_${TIMESTAMP}.sql"

pg_dump "$DATABASE_URL" > "backups/${BACKUP_FILE}"

# Upload to S3
aws s3 cp "backups/${BACKUP_FILE}" "s3://peptiq-backups/${BACKUP_FILE}"

# Clean up local file
rm "backups/${BACKUP_FILE}"

echo "Backup completed: ${BACKUP_FILE}"
```

## Restore Procedure

```bash
# Download from S3
aws s3 cp "s3://peptiq-backups/<backup-file>" ./restore.sql

# Restore
psql "$DATABASE_URL" < restore.sql
```

## Point-in-Time Recovery

RDS supports point-in-time recovery within the 14-day retention window:

```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier peptiq-db \
  --target-db-instance-identifier peptiq-db-restored \
  --restore-time <timestamp>
```
