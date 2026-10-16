#!/bin/sh
# Interactive Vault Unseal Helper for Raspberry Pi
# Supports running both from the host terminal and inside the container

set -e

# Check if running inside container or on the Pi host
if command -v vault >/dev/null 2>&1; then
  VAULT_BIN="vault"
else
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  REPO_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
  cd "$REPO_DIR"
  VAULT_BIN="docker compose -f infrastructure/docker-compose.infra.yml exec -T vault vault"
fi

if [ -z "$VAULT_ADDR" ]; then
  export VAULT_ADDR="https://127.0.0.1:8200"
fi

echo "Connecting to Vault at $VAULT_ADDR..."

STATUS=$($VAULT_BIN status -format=json 2>/dev/null || true)
if [ -z "$STATUS" ]; then
  echo "Error: Unable to connect to Vault at $VAULT_ADDR. Ensure the container is running:"
  echo "  docker compose -f infrastructure/docker-compose.infra.yml ps"
  exit 1
fi

SEALED=$(echo "$STATUS" | grep -o '"sealed":[^,]*' | cut -d: -f2 | tr -d ' "')

if [ "$SEALED" = "false" ]; then
  echo "Vault is already unsealed and ready for operations."
  exit 0
fi

THRESHOLD=$(echo "$STATUS" | grep -o '"t":[^,]*' | cut -d: -f2 | tr -d ' "')
PROGRESS=$(echo "$STATUS" | grep -o '"progress":[^,]*' | cut -d: -f2 | tr -d ' "')

echo "Vault is currently SEALED."
echo "Unseal threshold required: $THRESHOLD (Current progress: $PROGRESS/$THRESHOLD)"
echo ""

while [ "$SEALED" = "true" ]; do
  printf "Enter unseal key share: "
  stty -echo
  read -r UNSEAL_KEY
  stty echo
  echo ""

  if [ -z "$UNSEAL_KEY" ]; then
    echo "No key entered, exiting."
    exit 1
  fi

  $VAULT_BIN operator unseal "$UNSEAL_KEY" > /dev/null

  STATUS=$($VAULT_BIN status -format=json)
  SEALED=$(echo "$STATUS" | grep -o '"sealed":[^,]*' | cut -d: -f2 | tr -d ' "')
  if [ "$SEALED" = "false" ]; then
    echo ""
    echo "========================================="
    echo " SUCCESS: Vault unsealed successfully!   "
    echo "========================================="
    break
  fi
  CURRENT_PROGRESS=$(echo "$STATUS" | grep -o '"progress":[^,]*' | cut -d: -f2 | tr -d ' "')
  echo "Key accepted! Progress: $CURRENT_PROGRESS/$THRESHOLD"
done
