#!/usr/bin/env bash
# ==============================================================================
# ScanText OCR SaaS: Pull-Based Deployment Runner with Manifest Digest Verification
# ==============================================================================
set -euo pipefail

MANIFEST_FILE="${1:-/etc/scantext/release-manifest.json}"
LOCK_FILE="/var/run/scantext-deploy.lock"
VERSION_FILE="/etc/scantext/current_version"
ROLLBACK_FILE="/etc/scantext/rollback_version"
LOG_FILE="/var/log/scantext/deploy.log"

mkdir -p /var/log/scantext /etc/scantext

log() {
  local msg="[$(date +'%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

log_error() {
  local msg="[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR] $*"
  echo "$msg" >&2
  echo "$msg" >> "$LOG_FILE"
}

# Concurrency Guard: Prevent overlapping deployment executions
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  log_error "Another deployment is already in progress. Exiting."
  exit 1
fi

if [ ! -f "$MANIFEST_FILE" ]; then
  log_error "Release manifest file not found at: $MANIFEST_FILE"
  exit 1
fi

log "Parsing release manifest: $MANIFEST_FILE"
RELEASE_TAG=$(jq -r '.release_tag' "$MANIFEST_FILE")
COMMIT_SHA=$(jq -r '.commit_sha' "$MANIFEST_FILE")
BACKEND_DIGEST=$(jq -r '.images.backend.digest' "$MANIFEST_FILE")
FRONTEND_DIGEST=$(jq -r '.images.frontend.digest' "$MANIFEST_FILE")
PROXY_DIGEST=$(jq -r '.images.proxy.digest' "$MANIFEST_FILE")

CURRENT_TAG="none"
if [ -f "$VERSION_FILE" ]; then
  CURRENT_TAG=$(cat "$VERSION_FILE")
fi

if [ "$RELEASE_TAG" = "$CURRENT_TAG" ]; then
  log "System already running approved release $RELEASE_TAG. Nothing to do."
  exit 0
fi

log "Starting deployment of release $RELEASE_TAG (Commit: $COMMIT_SHA)"
echo "$CURRENT_TAG" > "$ROLLBACK_FILE"

# 1. Pull Images by Exact Cryptographic Digest
log "Pulling backend image: $BACKEND_DIGEST"
docker pull "ghcr.io/munya-sya/ocr-saas/backend@${BACKEND_DIGEST}"

log "Pulling frontend image: $FRONTEND_DIGEST"
docker pull "ghcr.io/munya-sya/ocr-saas/frontend@${FRONTEND_DIGEST}"

log "Pulling proxy image: $PROXY_DIGEST"
docker pull "ghcr.io/munya-sya/ocr-saas/proxy@${PROXY_DIGEST}"

# 2. Tag Digests Locally for Compose Compatibility
docker tag "ghcr.io/munya-sya/ocr-saas/backend@${BACKEND_DIGEST}" "ghcr.io/munya-sya/ocr-saas/backend:${RELEASE_TAG}"
docker tag "ghcr.io/munya-sya/ocr-saas/frontend@${FRONTEND_DIGEST}" "ghcr.io/munya-sya/ocr-saas/frontend:${RELEASE_TAG}"
docker tag "ghcr.io/munya-sya/ocr-saas/proxy@${PROXY_DIGEST}" "ghcr.io/munya-sya/ocr-saas/proxy:${RELEASE_TAG}"

export OCR_BACKEND_IMAGE="ghcr.io/munya-sya/ocr-saas/backend:${RELEASE_TAG}"
export OCR_FRONTEND_IMAGE="ghcr.io/munya-sya/ocr-saas/frontend:${RELEASE_TAG}"
export OCR_PROXY_IMAGE="ghcr.io/munya-sya/ocr-saas/proxy:${RELEASE_TAG}"

# 3. Database Migration Gate (Transient Container)
log "Executing reviewed database migrations..."
if ! docker compose -f infrastructure/docker-compose.infra.yml -f infrastructure/docker-compose.app.yml run --rm backend python -c "
from app.db.database import engine
from app.db.models import Base
Base.metadata.create_all(bind=engine)
print('Database schema verification OK.')
"; then
  log_error "Database migration gate failed! Aborting release."
  exit 1
fi

# 4. Graceful Container Rolling Restart
log "Recreating application containers..."
docker compose -f infrastructure/docker-compose.app.yml up -d

# 5. Health Check & Smoke Test
log "Awaiting healthy backend response..."
DEPLOY_SUCCESS=false
for i in {1..12}; do
  sleep 5
  if docker compose -f infrastructure/docker-compose.app.yml exec -T backend curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
    DEPLOY_SUCCESS=true
    log "Backend API health check verified."
    break
  fi
  log "Waiting for backend health (attempt $i/12)..."
done

if [ "$DEPLOY_SUCCESS" = false ]; then
  log_error "Health check timed out! Initiating rollback to $CURRENT_TAG..."
  if [ "$CURRENT_TAG" != "none" ]; then
    export OCR_BACKEND_IMAGE="ghcr.io/munya-sya/ocr-saas/backend:${CURRENT_TAG}"
    export OCR_FRONTEND_IMAGE="ghcr.io/munya-sya/ocr-saas/frontend:${CURRENT_TAG}"
    export OCR_PROXY_IMAGE="ghcr.io/munya-sya/ocr-saas/proxy:${CURRENT_TAG}"
    docker compose -f infrastructure/docker-compose.app.yml up -d
  fi
  exit 1
fi

echo "$RELEASE_TAG" > "$VERSION_FILE"
docker image prune -f > /dev/null 2>&1 || true
log "Deployment of release $RELEASE_TAG completed successfully."
exit 0
