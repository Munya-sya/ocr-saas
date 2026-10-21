#!/bin/bash
# ==============================================================================
# ScanText OCR SaaS - Automated PostgreSQL Database Backup Script
# Retention Policy: 7 days rolling retention
# Compression: Gzip compressed SQL dump
# ==============================================================================

set -eo pipefail

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-ocr_user}"
POSTGRES_DB="${POSTGRES_DB:-ocr_db}"
PGPASSWORD="${POSTGRES_PASSWORD:-ocr_password}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

export PGPASSWORD

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="ocr_backup_${TIMESTAMP}.sql.gz"
BACKUP_FILEPATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting automated database backup for '${POSTGRES_DB}' on ${POSTGRES_HOST}:${POSTGRES_PORT}..."

# Execute pg_dump streamed through gzip directly via the running Postgres container
if docker compose -f infrastructure/docker-compose.infra.yml exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip -9 > "$BACKUP_FILEPATH"; then
    FILE_SIZE=$(du -h "$BACKUP_FILEPATH" | cut -f1)
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup completed successfully: ${BACKUP_FILEPATH} (Size: ${FILE_SIZE})"
else
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ERROR: Database backup failed!" >&2
    rm -f "$BACKUP_FILEPATH"
    exit 1
fi

# Prune archives older than RETENTION_DAYS
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Pruning backup files older than ${RETENTION_DAYS} days in ${BACKUP_DIR}..."
find "$BACKUP_DIR" -type f -name "ocr_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -exec rm -v {} \;

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Database backup routine completed."
