#!/bin/sh
# Interactive Vault Unseal Helper for Raspberry Pi
# Prompts for Shamir key shares to unseal local Vault server

set -e

if [ -z "$VAULT_ADDR" ]; then
  export VAULT_ADDR="https://127.0.0.1:8200"
fi

echo "Connecting to Vault at $VAULT_ADDR..."

STATUS=$(vault status -format=json 2>/dev/null || true)
if [ -z "$STATUS" ]; then
  echo "Error: Unable to connect to Vault at $VAULT_ADDR. Ensure the container is running."
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

  vault operator unseal "$UNSEAL_KEY"

  STATUS=$(vault status -format=json)
  SEALED=$(echo "$STATUS" | grep -o '"sealed":[^,]*' | cut -d: -f2 | tr -d ' "')
  if [ "$SEALED" = "false" ]; then
    echo ""
    echo "SUCCESS: Vault unsealed successfully!"
    break
  fi
done
