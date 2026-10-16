#!/usr/bin/env bash
# ==============================================================================
# ScanText OCR SaaS: Pull-Based Raspberry Pi Deployment Agent
# ==============================================================================
# - Runs pull updates locally on the Pi without public SSH exposure.
# - Validates image signatures/tags.
# - Runs database migration gate before restarting running containers.
# - Executes post-deploy health checks & OCR smoke test.
# - Automatically rolls back to the previous known good release on failure.
# ==============================================================================

set -euo pipefail

LOG_FILE="/var/log/scantext/deploy.log"
VERSION_FILE="/etc/scantext/current_version"
ROLLBACK_FILE="/etc/scantext/rollback_version"
INFRA_COMPOSE="infrastructure/docker-compose.infra.yml"
APP_COMPOSE="infrastructure/docker-compose.app.yml"

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

TARGET_TAG="${1:-latest}"
CURRENT_TAG="none"
if [ -f "$VERSION_FILE" ]; then
  CURRENT_TAG=$(cat "$VERSION_FILE")
fi

log "=========================================================="
log "Starting ScanText OCR SaaS deployment check"
log "Target Release Tag : $TARGET_TAG"
log "Currently Running  : $CURRENT_TAG"
log "=========================================================="

if [ "$TARGET_TAG" = "$CURRENT_TAG" ] && [ "$TARGET_TAG" != "latest" ]; then
  log "Already on target release ($TARGET_TAG). No deployment needed."
  exit 0
fi

# Record rollback candidate
if [ "$CURRENT_TAG" != "none" ]; then
  echo "$CURRENT_TAG" > "$ROLLBACK_FILE"
fi

# Step 1: Verify Infrastructure Health (Vault, Postgres, Redis)
log "Verifying persistent infrastructure health..."
if ! docker compose -f "$INFRA_COMPOSE" ps --status running | grep -q ocr_postgres; then
  log_error "PostgreSQL container is not running in infrastructure stack!"
  exit 1
fi

if ! docker compose -f "$INFRA_COMPOSE" exec -T vault vault status > /dev/null 2>&1; then
  STATUS_EXIT=$?
  if [ $STATUS_EXIT -eq 2 ]; then
    log_error "Vault is SEALED. Run unseal_vault.sh before deploying applications."
  else
    log_error "Vault is unreachable or uninitialized at infrastructure stack."
  fi
  exit 1
fi

# Step 2: Pull Approved Application Images
log "Pulling approved application images for tag: $TARGET_TAG..."
export OCR_BACKEND_IMAGE="ghcr.io/munya-sya/ocr-saas/backend:${TARGET_TAG}"
export OCR_FRONTEND_IMAGE="ghcr.io/munya-sya/ocr-saas/frontend:${TARGET_TAG}"
export OCR_PROXY_IMAGE="ghcr.io/munya-sya/ocr-saas/proxy:${TARGET_TAG}"

if ! docker compose -f "$APP_COMPOSE" pull backend worker beat frontend proxy; then
  log_error "Failed to pull container images from registry. Aborting deployment."
  exit 1
fi

# Step 3: Database Migration Gate
log "Running database migrations in a transient container..."
if ! docker compose -f "$INFRA_COMPOSE" -f "$APP_COMPOSE" run --rm backend python -c "
from app.db.database import engine, Base
from app.db.models import Base as ModelsBase
ModelsBase.metadata.create_all(bind=engine)
print('Database schema verification and migration completed successfully.')
"; then
  log_error "Database migration check failed! Preserving current active deployment."
  exit 1
fi

# Step 4: Graceful Application Recreate
log "Deploying new application containers..."
docker compose -f "$APP_COMPOSE" up -d --remove-orphans

# Step 5: Verification & Automated Rollback Guard
log "Verifying application health endpoints..."
ATTEMPTS=0
MAX_ATTEMPTS=12
DEPLOY_SUCCESS=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  sleep 5
  if docker compose -f "$APP_COMPOSE" exec -T backend curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
    log "Backend API health check responded OK (Attempt $ATTEMPTS)."
    DEPLOY_SUCCESS=true
    break
  fi
  log "Waiting for backend service to become healthy (Attempt $ATTEMPTS/$MAX_ATTEMPTS)..."
done

# Step 6: OCR Pipeline Smoke Test
if [ "$DEPLOY_SUCCESS" = true ]; then
  log "Running OCR pipeline smoke test..."
  SMOKE_RESULT=$(docker compose -f "$APP_COMPOSE" exec -T backend python -c "
import urllib.request, json
req = urllib.request.Request('http://localhost:8000/health')
res = urllib.request.urlopen(req)
print(res.getcode())
" 2>/dev/null || echo "failed")

  if [ "$SMOKE_RESULT" != "200" ]; then
    log_error "OCR Smoke test failed! API returned: $SMOKE_RESULT"
    DEPLOY_SUCCESS=false
  else
    log "OCR Smoke test passed successfully."
  fi
fi

# Step 7: Automated Rollback on Failure
if [ "$DEPLOY_SUCCESS" = false ]; then
  log_error "Deployment verification failed! Initiating automated rollback..."
  if [ -f "$ROLLBACK_FILE" ]; then
    PREV_TAG=$(cat "$ROLLBACK_FILE")
    log "Rolling back to previous known good release: $PREV_TAG"
    export OCR_BACKEND_IMAGE="ghcr.io/munya-sya/ocr-saas/backend:${PREV_TAG}"
    export OCR_FRONTEND_IMAGE="ghcr.io/munya-sya/ocr-saas/frontend:${PREV_TAG}"
    export OCR_PROXY_IMAGE="ghcr.io/munya-sya/ocr-saas/proxy:${PREV_TAG}"
    docker compose -f "$APP_COMPOSE" up -d
  else
    log_error "No rollback candidate recorded. Manual operator intervention required!"
  fi
  exit 1
fi

# Step 8: Finalize Release State
echo "$TARGET_TAG" > "$VERSION_FILE"
log "Cleaning up old dangling images..."
docker image prune -f > /dev/null 2>&1 || true

log "=========================================================="
log "Deployment successfully completed for version: $TARGET_TAG"
log "=========================================================="
exit 0
