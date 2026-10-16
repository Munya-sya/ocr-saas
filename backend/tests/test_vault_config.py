import os
import json
import tempfile
import pytest
from app.core.config import load_vault_secrets, Settings

def test_load_vault_secrets_missing_file():
    secrets = load_vault_secrets("/non/existent/path/secrets.json")
    assert secrets == {}

def test_load_vault_secrets_valid_json():
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json") as f:
        json.dump({
            "DATABASE_URL": "postgresql://vault_user:vault_pass@pi-db:5432/ocr_prod",
            "JWT_SECRET": "a_very_secure_and_long_vault_provided_jwt_secret_key_12345",
            "STRIPE_SECRET_KEY": "sk_live_vault_test_key"
        }, f)
        temp_path = f.name

    try:
        secrets = load_vault_secrets(temp_path)
        assert secrets["DATABASE_URL"] == "postgresql://vault_user:vault_pass@pi-db:5432/ocr_prod"
        assert secrets["JWT_SECRET"] == "a_very_secure_and_long_vault_provided_jwt_secret_key_12345"
        assert secrets["STRIPE_SECRET_KEY"] == "sk_live_vault_test_key"
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def test_load_vault_secrets_invalid_or_malformed_json():
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json") as f:
        f.write("{ invalid json formatting !!!")
        temp_path = f.name

    try:
        secrets = load_vault_secrets(temp_path)
        assert secrets == {}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def test_load_vault_secrets_non_dict_json():
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json") as f:
        json.dump(["array", "of", "strings"], f)
        temp_path = f.name

    try:
        secrets = load_vault_secrets(temp_path)
        assert secrets == {}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
