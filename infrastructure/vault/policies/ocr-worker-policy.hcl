# Least-Privilege Vault ACL Policy for Celery Worker
# Grants read access strictly to Worker runtime secrets (DB & Redis only)

path "secret/data/ocr-saas/worker" {
  capabilities = ["read"]
}

path "secret/metadata/ocr-saas/worker" {
  capabilities = ["read"]
}
