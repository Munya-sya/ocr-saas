# Least-Privilege Vault ACL Policy for Backend API
# Grants read access strictly to API runtime secrets

path "secret/data/ocr-saas/api" {
  capabilities = ["read"]
}

path "secret/metadata/ocr-saas/api" {
  capabilities = ["read"]
}
