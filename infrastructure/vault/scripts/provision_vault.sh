#!/bin/sh
# Idempotent Vault Provisioning Script for ScanText OCR SaaS
# Usage: VAULT_TOKEN="<root-token>" ./provision_vault.sh

set -e

if [ -z "$VAULT_TOKEN" ]; then
  echo "ERROR: VAULT_TOKEN is required to provision policies and AppRoles."
  exit 1
fi

# Detect whether running inside container or on the Pi host
if command -v vault >/dev/null 2>&1; then
  VAULT_BIN="vault"
else
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  REPO_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
  cd "$REPO_DIR"
  VAULT_BIN="docker compose -f infrastructure/docker-compose.infra.yml exec -T -e VAULT_TOKEN=$VAULT_TOKEN vault vault"
fi

echo "=== [1/6] Verifying Vault Status ==="
STATUS=$($VAULT_BIN status -format=json 2>/dev/null || true)
if [ -z "$STATUS" ]; then
  echo "ERROR: Unable to communicate with Vault container. Ensure it is running."
  exit 1
fi

SEALED=$(echo "$STATUS" | grep -o '"sealed":[^,]*' | cut -d: -f2 | tr -d ' "')
if [ "$SEALED" = "true" ]; then
  echo "ERROR: Vault is currently SEALED. Unseal it before running provisioning."
  exit 1
fi

echo "=== [2/6] Enabling Audit Logging ==="
$VAULT_BIN audit enable file file_path=/vault/logs/vault.audit.log 2>/dev/null || echo "Audit log already enabled."

echo "=== [3/6] Enabling KV v2 Secret Engine ==="
$VAULT_BIN secrets enable -path=secret kv-v2 2>/dev/null || echo "KV v2 already mounted at secret/"

echo "=== [4/6] Applying Least-Privilege ACL Policies ==="
$VAULT_BIN policy write ocr-api /vault/policies/ocr-api-policy.hcl
$VAULT_BIN policy write ocr-worker /vault/policies/ocr-worker-policy.hcl

echo "=== [5/6] Configuring AppRole Authentication ==="
$VAULT_BIN auth enable approle 2>/dev/null || echo "AppRole auth already enabled."

# Configure API Role
$VAULT_BIN write auth/approle/role/ocr-api-role \
  token_policies="ocr-api" \
  token_ttl=1h \
  token_max_ttl=24h \
  secret_id_ttl=720h \
  secret_id_num_uses=0

# Configure Worker Role
$VAULT_BIN write auth/approle/role/ocr-worker-role \
  token_policies="ocr-worker" \
  token_ttl=1h \
  token_max_ttl=24h \
  secret_id_ttl=720h \
  secret_id_num_uses=0

AUTH_DIR="${TARGET_AUTH_DIR:-/etc/scantext/auth}"
sudo mkdir -p "$AUTH_DIR"
sudo chmod 700 "$AUTH_DIR"

# Generate Role ID and Secret ID for Vault Agent
ROLE_ID=$($VAULT_BIN read -field=role_id auth/approle/role/ocr-api-role/role-id)
SECRET_ID=$($VAULT_BIN write -f -field=secret_id auth/approle/role/ocr-api-role/secret-id)

echo "$ROLE_ID" | sudo tee "$AUTH_DIR/role-id" > /dev/null
echo "$SECRET_ID" | sudo tee "$AUTH_DIR/secret-id" > /dev/null
sudo chmod 600 "$AUTH_DIR/role-id" "$AUTH_DIR/secret-id"

echo "=== [6/6] Writing Initial Baseline Secrets if Not Present ==="
if ! $VAULT_BIN kv get secret/ocr-saas/api > /dev/null 2>&1; then
  echo "Writing baseline secrets to secret/ocr-saas/api..."
  $VAULT_BIN kv put secret/ocr-saas/api \
    DATABASE_URL="${INITIAL_DATABASE_URL:-postgresql://ocr_user:ocr_password@postgres:5432/ocr_db}" \
    REDIS_URL="${INITIAL_REDIS_URL:-redis://:ocr_redis_secure_pass@redis:6379/0}" \
    JWT_SECRET="${INITIAL_JWT_SECRET:-$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)}" \
    STRIPE_SECRET_KEY="${INITIAL_STRIPE_SECRET_KEY:-sk_test_placeholder_key}" \
    STRIPE_PUBLISHABLE_KEY="${INITIAL_STRIPE_PUBLISHABLE_KEY:-pk_test_placeholder_key}" \
    STRIPE_WEBHOOK_SECRET="${INITIAL_STRIPE_WEBHOOK_SECRET:-whsec_placeholder_secret}" \
    STRIPE_PRO_MONTHLY_PRICE_ID="${INITIAL_STRIPE_PRO_PRICE_ID:-price_ocr_pro_monthly_test}" \
    GOOGLE_CLIENT_ID="${INITIAL_GOOGLE_CLIENT_ID:-}" \
    GOOGLE_CLIENT_SECRET="${INITIAL_GOOGLE_CLIENT_SECRET:-}" \
    CAPTCHA_SITE_KEY="${INITIAL_CAPTCHA_SITE_KEY:-}" \
    CAPTCHA_SECRET_KEY="${INITIAL_CAPTCHA_SECRET_KEY:-}" \
    INITIAL_ADMIN_EMAIL="${INITIAL_ADMIN_EMAIL:-admin@scantext-ocr.com}"
fi

echo ""
echo "================================================================"
echo " Vault provisioning complete!"
echo " AppRole Role ID and Secret ID written to: $AUTH_DIR"
echo "================================================================"
