#!/bin/sh
# Idempotent Vault Provisioning Script for ScanText OCR SaaS
# Usage: VAULT_ADDR="https://127.0.0.1:8200" VAULT_TOKEN="<root-token>" ./provision_vault.sh

set -e

echo "=== [1/6] Verifying Vault Status ==="
if [ -z "$VAULT_ADDR" ]; then
  export VAULT_ADDR="https://127.0.0.1:8200"
fi

if [ -z "$VAULT_CACERT" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  if [ -f "$SCRIPT_DIR/../certs/ca.crt" ]; then
    export VAULT_CACERT="$SCRIPT_DIR/../certs/ca.crt"
  elif [ -f "/vault/certs/ca.crt" ]; then
    export VAULT_CACERT="/vault/certs/ca.crt"
  fi
fi

if [ -z "$VAULT_TOKEN" ]; then
  echo "ERROR: VAULT_TOKEN is required to provision policies and AppRoles."
  exit 1
fi

vault status > /dev/null 2>&1 || {
  echo "ERROR: Vault is unreachable or sealed at $VAULT_ADDR"
  exit 1
}

echo "=== [2/6] Enabling Audit Logging ==="
vault audit enable file file_path=/vault/logs/vault.audit.log 2>/dev/null || echo "Audit log already enabled."

echo "=== [3/6] Enabling KV v2 Secret Engine ==="
vault secrets enable -path=secret kv-v2 2>/dev/null || echo "KV v2 already mounted at secret/"

echo "=== [4/6] Applying Least-Privilege ACL Policies ==="
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
POLICIES_DIR="$(cd "$SCRIPT_DIR/../policies" && pwd)"

vault policy write ocr-api "$POLICIES_DIR/ocr-api-policy.hcl"
vault policy write ocr-worker "$POLICIES_DIR/ocr-worker-policy.hcl"

echo "=== [5/6] Configuring AppRole Authentication ==="
vault auth enable approle 2>/dev/null || echo "AppRole auth already enabled."

# Configure API Role
vault write auth/approle/role/ocr-api-role \
  token_policies="ocr-api" \
  token_ttl=1h \
  token_max_ttl=24h \
  secret_id_ttl=720h \
  secret_id_num_uses=0

# Configure Worker Role
vault write auth/approle/role/ocr-worker-role \
  token_policies="ocr-worker" \
  token_ttl=1h \
  token_max_ttl=24h \
  secret_id_ttl=720h \
  secret_id_num_uses=0

AUTH_DIR="${TARGET_AUTH_DIR:-/etc/scantext/auth}"
mkdir -p "$AUTH_DIR"
chmod 700 "$AUTH_DIR"

# Generate Role ID and Secret ID for Vault Agent
ROLE_ID=$(vault read -field=role_id auth/approle/role/ocr-api-role/role-id)
SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/ocr-api-role/secret-id)

echo "$ROLE_ID" > "$AUTH_DIR/role-id"
echo "$SECRET_ID" > "$AUTH_DIR/secret-id"
chmod 600 "$AUTH_DIR/role-id" "$AUTH_DIR/secret-id"

echo "=== [6/6] Writing Initial Baseline Secrets if Not Present ==="
if ! vault kv get secret/ocr-saas/api > /dev/null 2>&1; then
  echo "Writing baseline secrets to secret/ocr-saas/api..."
  vault kv put secret/ocr-saas/api \
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
echo " IMPORTANT: Securely revoke your root token now using:"
echo "   vault token revoke $VAULT_TOKEN"
echo "================================================================"
