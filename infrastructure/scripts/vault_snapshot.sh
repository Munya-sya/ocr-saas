#!/usr/bin/env bash
# ==============================================================================
# ScanText OCR SaaS: Off-Device HashiCorp Vault Raft Snapshot Script
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${LOCAL_BACKUP_DIR:-/var/backups/scantext/vault}"
REMOTE_DEST="${REMOTE_BACKUP_DEST:-}" # e.g. user@backup-nas:/backups/scantext/
RETENTION_DAYS=14
TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
SNAPSHOT_FILE="${BACKUP_DIR}/vault_raft_${TIMESTAMP}.snap"

mkdir -p "$BACKUP_DIR"

echo "=== Taking Vault Raft Snapshot ==="
docker compose -f infrastructure/docker-compose.infra.yml exec -T vault \
  vault operator raft snapshot save "/vault/data/vault_${TIMESTAMP}.snap"

# Move snapshot out of container volume to host backup directory
docker cp "ocr_vault:/vault/data/vault_${TIMESTAMP}.snap" "$SNAPSHOT_FILE"
docker compose -f infrastructure/docker-compose.infra.yml exec -T vault \
  rm -f "/vault/data/vault_${TIMESTAMP}.snap"

chmod 600 "$SNAPSHOT_FILE"
echo "Snapshot saved locally to: $SNAPSHOT_FILE ($(du -h "$SNAPSHOT_FILE" | cut -f1))"

# Optional GPG Encryption
if [ -n "${GPG_RECIPIENT:-}" ]; then
  echo "Encrypting snapshot with GPG for: $GPG_RECIPIENT..."
  gpg --batch --yes --encrypt --recipient "$GPG_RECIPIENT" "$SNAPSHOT_FILE"
  rm -f "$SNAPSHOT_FILE"
  SNAPSHOT_FILE="${SNAPSHOT_FILE}.gpg"
fi

# Ship off-device if remote destination configured
if [ -n "$REMOTE_DEST" ]; then
  echo "Shipping snapshot off-device to $REMOTE_DEST..."
  rsync -avz -e "ssh -o BatchMode=yes" "$SNAPSHOT_FILE" "$REMOTE_DEST"
  echo "Off-device sync complete."
fi

# Prune old local snapshots
find "$BACKUP_DIR" -name "vault_raft_*.snap*" -mtime +"$RETENTION_DAYS" -exec rm -f {} +
echo "Local snapshot retention clean up complete."
