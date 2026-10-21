#!/bin/bash
# ==============================================================================
# ScanText OCR SaaS - PostgreSQL Database Restore Utility
# Usage: ./restore_db.sh /path/to/ocr_backup_YYYYMMDD_HHMMSS.sql.gz
# ==============================================================================

set -eo pipefail

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz>"
    echo "Example: $0 /backups/ocr_backup_20261015_200000.sql.gz"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file '$BACKUP_FILE' does not exist." >&2
    exit 1
fi

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-ocr_user}"
POSTGRES_DB="${POSTGRES_DB:-ocr_db}"
PGPASSWORD="${POSTGRES_PASSWORD:-ocr_password}"

export PGPASSWORD

echo "==================================================================="
echo "WARNING: Restoring will overwrite existing data in '${POSTGRES_DB}'"
echo "Target: ${POSTGRES_HOST}:${POSTGRES_PORT} / ${POSTGRES_DB}"
echo "Source: ${BACKUP_FILE}"
echo "==================================================================="

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Commencing database restoration..."

if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker compose -f infrastructure/docker-compose.infra.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
else
    cat "$BACKUP_FILE" | docker compose -f infrastructure/docker-compose.infra.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Database restored successfully from ${BACKUP_FILE}."
