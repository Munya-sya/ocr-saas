# Complete Raspberry Pi (ARM64) Implementation Guide
## ScanText OCR SaaS with HashiCorp Vault & Pull-Based CI/CD

This guide provides step-by-step instructions for deploying the complete ScanText OCR SaaS on a fresh Raspberry Pi system using official ARM64 Docker images, HashiCorp Vault server mode with Raft storage on SSD, and automated pull-based deployments.

---

## 1. Hardware & OS Prerequisites

### Required Hardware
- **Single Board Computer**: Raspberry Pi 4 Model B (4GB or 8GB RAM) or Raspberry Pi 5 (4GB or 8GB RAM).
- **Storage**: USB 3.0 external SSD or NVMe M.2 PCIe HAT formatted with `ext4`.
  > [!CAUTION]
  > **Do NOT run HashiCorp Vault Raft or PostgreSQL on a MicroSD card.** The continuous Raft write-ahead log (WAL) syncs will wear out flash memory rapidly and cause severe I/O latency.
- **Power Supply**: Official Raspberry Pi 27W USB-C Power Supply (Pi 5) or 15.3W Power Supply (Pi 4) to eliminate under-voltage kernel throttling.
- **Cooling**: Active cooler or aluminum heatsink case (Tesseract OCR is CPU-intensive).

### Operating System
- **OS**: **Raspberry Pi OS Lite 64-bit** (Debian 12 Bookworm) or **Ubuntu Server 24.04 LTS (64-bit ARM64)**.
- Verify 64-bit architecture:
  ```bash
  uname -m
  # Must output: aarch64
  ```

---

## 2. Base System & Docker Setup

### 2.1 Update System Packages
```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git jq openssl htop ufw
```

### 2.2 Disable Swapping (Protects Vault Memory from Leaking to Disk)
```bash
sudo dphys-swapfile swapoff
sudo dphys-swapfile uninstall
sudo systemctl disable dphys-swapfile
```

### 2.3 Install Docker Engine & Compose v2 for ARM64
```bash
# Install Docker via official script
curl -fsSL https://get.docker.com | sh

# Add current user to docker group
sudo usermod -aG docker $USER

# Enable and start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Apply group changes without logging out
newgrp docker

# Verify Docker ARM64 installation
docker version
docker compose version
```

### 2.4 Mount SSD Storage for Persistent Data
Ensure your SSD is mounted (e.g. at `/mnt/ssd`) and add it to `/etc/fstab` for persistent mounting across reboots:
```bash
sudo mkdir -p /mnt/ssd/ocr-saas
sudo chown -R $USER:$USER /mnt/ssd/ocr-saas
```

---

## 3. Clone Repository & Setup Directory Permissions

```bash
cd /opt
sudo git clone https://github.com/Munya-sya/ocr-saas.git /opt/ocr-saas
sudo chown -R $USER:$USER /opt/ocr-saas
cd /opt/ocr-saas

# Create protected system directories
sudo mkdir -p /etc/scantext/auth
sudo mkdir -p /var/log/scantext
sudo mkdir -p /var/backups/scantext/vault

sudo chmod 700 /etc/scantext/auth
sudo chmod 750 /var/log/scantext
sudo chmod 700 /var/backups/scantext
```

---

## 4. Internal TLS Certificate Generation for Vault

Vault server requires TLS on its private Docker network listener:

```bash
mkdir -p /opt/ocr-saas/infrastructure/vault/certs
cd /opt/ocr-saas/infrastructure/vault/certs

# Generate private CA and self-signed certificate for Vault container (valid for 3 years)
openssl req -newkey rsa:2048 -nodes -keyout vault.key -x509 -days 1095 -out vault.crt \
  -subj "/CN=vault" \
  -addext "subjectAltName=DNS:vault,DNS:localhost,IP:127.0.0.1"

# Copy certificate as trusted CA for Vault Agent
cp vault.crt ca.crt

# Set strict read permissions for Vault container user (UID 100)
chmod 644 vault.crt ca.crt
chmod 600 vault.key
sudo chown -R 100:1000 .
```

---

## 5. Persistent Infrastructure Deployment (Vault, Postgres, Redis)

The infrastructure stack is managed separately from application code so application updates never disturb state.

### 5.1 Start Infrastructure Services
```bash
cd /opt/ocr-saas
docker compose -f infrastructure/docker-compose.infra.yml up -d
```
Verify that all 3 services are running:
```bash
docker compose -f infrastructure/docker-compose.infra.yml ps
```

### 5.2 Initialize HashiCorp Vault
```bash
# Run Vault operator init with 5 Shamir shares and 3 threshold
docker compose -f infrastructure/docker-compose.infra.yml exec vault \
  vault operator init -key-shares=5 -key-threshold=3 > /tmp/vault-keys.txt

# Secure the initialization output
cat /tmp/vault-keys.txt
```

> [!IMPORTANT]
> **IMMEDIATELY record the 5 Unseal Keys and Initial Root Token** into a secure password manager (e.g. 1Password, Bitwarden). Then securely wipe the file:
> ```bash
> shred -u /tmp/vault-keys.txt
> ```

### 5.3 Unseal Vault
Run the interactive unseal helper:
```bash
chmod +x infrastructure/vault/scripts/unseal_vault.sh
./infrastructure/vault/scripts/unseal_vault.sh
```
*(Enter 3 of your 5 Shamir unseal keys when prompted until Vault displays `Vault unsealed successfully!`)*

### 5.4 Provision AppRoles, Policies, and Baseline Secrets
Run the provisioning script using your Initial Root Token:
```bash
chmod +x infrastructure/vault/scripts/provision_vault.sh

# Run provisioning
VAULT_ADDR="https://127.0.0.1:8200" \
VAULT_TOKEN="<YOUR_INITIAL_ROOT_TOKEN>" \
TARGET_AUTH_DIR="/etc/scantext/auth" \
./infrastructure/vault/scripts/provision_vault.sh
```

### 5.5 Revoke Root Token
Once AppRole credentials (`role-id` and `secret-id`) are generated in `/etc/scantext/auth`, revoke the root token to ensure zero root exposure:
```bash
docker compose -f infrastructure/docker-compose.infra.yml exec \
  -e VAULT_TOKEN="<YOUR_INITIAL_ROOT_TOKEN>" vault \
  vault token revoke "<YOUR_INITIAL_ROOT_TOKEN>"
```

---

## 6. Registry Authentication & Pull-Based Application Deployment

### 6.1 Authenticate with GitHub Container Registry (GHCR)
Generate a GitHub Personal Access Token (classic) with **only `read:packages`** scope and authenticate:
```bash
echo "<YOUR_GITHUB_PAT>" | docker login ghcr.io -u "<YOUR_GITHUB_USERNAME>" --password-stdin
```

### 6.2 Execute Initial Application Rollout
Make the deployment script executable and run the release:
```bash
chmod +x infrastructure/scripts/pi_deploy.sh
sudo ./infrastructure/scripts/pi_deploy.sh latest
```

The script will:
1. Verify Vault and PostgreSQL are healthy.
2. Pull ARM64 images from GHCR.
3. Run database migrations via a transient container.
4. Launch the application stack (`vault-agent`, `backend`, `worker`, `beat`, `frontend`, `proxy`).
5. Verify health check and execute the OCR smoke test.

### 6.3 Verify Deployment Status
```bash
# Check running application containers
docker compose -f infrastructure/docker-compose.app.yml ps

# Verify Vault Agent has rendered the restricted JSON secrets
sudo cat /etc/scantext/auth/role-id
docker compose -f infrastructure/docker-compose.app.yml exec backend ls -la /vault/secrets/
```

Access your application:
- **Web App**: Open `http://<RASPBERRY_PI_IP>` in your browser.
- **API Health**: `http://<RASPBERRY_PI_IP>/api/v1/health`
- **Mail Catcher (Local Dev/Staging)**: `http://<RASPBERRY_PI_IP>/mail/`

---

## 7. Automated Continuous Deployment via Systemd Timer

Enable outbound pull-based continuous deployment on the Pi without opening inbound SSH ports:

```bash
# Copy systemd units
sudo cp infrastructure/scripts/scantext-deploy.service /etc/systemd/system/
sudo cp infrastructure/scripts/scantext-deploy.timer /etc/systemd/system/

# Reload systemd and enable timer
sudo systemctl daemon-reload
sudo systemctl enable --now scantext-deploy.timer

# Verify timer schedule
sudo systemctl list-timers --all | grep scantext
```

---

## 8. Operational Runbooks for Raspberry Pi

### 8.1 Reboot Recovery (Manual Unseal)
When the Raspberry Pi reboots (e.g. after a power cycle or kernel update):
1. Docker automatically starts PostgreSQL, Redis, and Vault.
2. Vault starts in a **SEALED** state.
3. SSH into the Pi locally (or connect keyboard/monitor) and run:
   ```bash
   cd /opt/ocr-saas
   ./infrastructure/vault/scripts/unseal_vault.sh
   ```
4. Enter 3 unseal keys.
5. Vault Agent immediately detects Vault is unsealed, acquires a new token, renders `/vault/secrets/secrets.json`, and backend services resume traffic.

### 8.2 Vault Raft Backups (Snapshots)
Take a snapshot and ship it off-device:
```bash
chmod +x infrastructure/scripts/vault_snapshot.sh
sudo ./infrastructure/scripts/vault_snapshot.sh
```
Configure a daily cron job at 3:00 AM:
```bash
sudo crontab -e
# Add line:
0 3 * * * /opt/ocr-saas/infrastructure/scripts/vault_snapshot.sh >> /var/log/scantext/vault_backup.log 2>&1
```

### 8.3 Secret Rotation (e.g. Stripe Key or JWT Secret)
To rotate a secret without downtime:
1. Log into Vault CLI or web UI (`https://<RASPBERRY_PI_IP>:8200`):
   ```bash
   vault kv patch secret/ocr-saas/api STRIPE_SECRET_KEY="sk_live_new_rotated_key"
   ```
2. Vault Agent sidecar detects the KV v2 update and rewires `/vault/secrets/secrets.json`.
3. Gracefully reload backend and worker:
   ```bash
   docker compose -f infrastructure/docker-compose.app.yml restart backend worker
   ```
