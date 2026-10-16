# Vault Agent Configuration for ScanText OCR SaaS
# Renders restricted runtime JSON configuration for API & Worker containers

exit_after_auth = false
pid_file        = "/tmp/vault-agent.pid"
disable_mlock   = true

vault {
  address = "https://vault:8200"
  ca_cert = "/vault/certs/ca.crt"
  retry {
    num_retries = 10
  }
}

auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path                   = "/vault/auth/role-id"
      secret_id_file_path                 = "/vault/auth/secret-id"
      remove_secret_id_file_after_reading = false
    }
  }

  sink "file" {
    config = {
      path = "/vault/secrets/token"
      mode = 0644
    }
  }
}

# Template: Renders API and Worker application runtime secrets
template {
  contents = <<-EOF
  {{ with secret "secret/data/ocr-saas/api" }}
  {
    "DATABASE_URL": "{{ .Data.data.DATABASE_URL }}",
    "REDIS_URL": "{{ .Data.data.REDIS_URL }}",
    "JWT_SECRET": "{{ .Data.data.JWT_SECRET }}",
    "STRIPE_SECRET_KEY": "{{ .Data.data.STRIPE_SECRET_KEY }}",
    "STRIPE_PUBLISHABLE_KEY": "{{ .Data.data.STRIPE_PUBLISHABLE_KEY }}",
    "STRIPE_WEBHOOK_SECRET": "{{ .Data.data.STRIPE_WEBHOOK_SECRET }}",
    "STRIPE_PRO_MONTHLY_PRICE_ID": "{{ .Data.data.STRIPE_PRO_MONTHLY_PRICE_ID }}",
    "GOOGLE_CLIENT_ID": "{{ .Data.data.GOOGLE_CLIENT_ID }}",
    "GOOGLE_CLIENT_SECRET": "{{ .Data.data.GOOGLE_CLIENT_SECRET }}",
    "CAPTCHA_SITE_KEY": "{{ .Data.data.CAPTCHA_SITE_KEY }}",
    "CAPTCHA_SECRET_KEY": "{{ .Data.data.CAPTCHA_SECRET_KEY }}",
    "INITIAL_ADMIN_EMAIL": "{{ .Data.data.INITIAL_ADMIN_EMAIL }}"
  }
  {{ end }}
  EOF
  destination = "/vault/secrets/secrets.json"
  perms       = "0644"
}
