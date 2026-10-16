# HashiCorp Vault Server Configuration for Raspberry Pi (ARM64)
# Production Server Mode with Raft Integrated Storage

ui            = true
disable_mlock = true

storage "raft" {
  path    = "/vault/data"
  node_id = "pi-vault-node-1"
}

# HTTP / TLS Listener
# By default, Vault binds to 0.0.0.0:8200 inside the internal Docker network
listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_disable   = "0"
  tls_cert_file = "/vault/certs/vault.crt"
  tls_key_file  = "/vault/certs/vault.key"
}

# Internal API & Cluster Discovery Addresses
api_addr     = "https://vault:8200"
cluster_addr = "https://vault:8201"

# Telemetry and Health Checks
telemetry {
  disable_hostname = true
  prometheus_retention_time = "24h"
}

default_lease_ttl = "72h"
max_lease_ttl     = "720h"
