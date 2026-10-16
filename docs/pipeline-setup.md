# GitHub Actions CI/CD & Registry Setup Guide

This guide details how your GitHub Actions pipeline tests, builds, scans, and publishes immutable ARM64 container images to the GitHub Container Registry (GHCR), and how your Raspberry Pi securely authenticates with minimal privileges.

---

## 1. Registry Architecture & Security

Container images are stored in **GitHub Container Registry (GHCR)**:
- Backend: `ghcr.io/<github-user>/ocr-saas/backend`
- Frontend: `ghcr.io/<github-user>/ocr-saas/frontend`
- Proxy: `ghcr.io/<github-user>/ocr-saas/proxy`

### Security Boundary:
1. **GitHub Actions (Publisher)**: Uses the ephemeral `${{ secrets.GITHUB_TOKEN }}` generated for each workflow run. It is granted `packages:write` strictly during the release job.
2. **Raspberry Pi (Consumer)**: Uses a dedicated Personal Access Token (PAT) with **only `read:packages`** permission. The Pi cannot push images, delete packages, or access private source code.

---

## 2. Generating the Pi's Registry Access Token (Privately)

On your computer:
1. Go to GitHub $\rightarrow$ **Settings** (top right profile icon) $\rightarrow$ **Developer settings** $\rightarrow$ **Personal access tokens** $\rightarrow$ **Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Note: `ScanText Pi Pull Token`.
4. Expiration: 90 days or 1 year.
5. Select scopes:
   - [x] **`read:packages`** (Download packages from GitHub Container Registry)
   *(Do NOT check `write:packages`, `repo`, `admin`, or any other box).*
6. Click **Generate token** and copy it.

---

## 3. Authenticating the Raspberry Pi with GHCR

On your Raspberry Pi terminal, log into GHCR using your token:

```bash
echo "<YOUR_COPIED_GITHUB_PAT>" | docker login ghcr.io -u "<YOUR_GITHUB_USERNAME>" --password-stdin
```

### Expected Output:
```text
Login Succeeded
```
*(Docker securely stores the token in `/home/kennedy/.docker/config.json` with restricted user-only permissions).*

---

## 4. Branch Protection & Release Approval Configuration

To guarantee that untrusted code or unreviewed Pull Requests never trigger an ARM64 release:

1. Navigate to your GitHub Repository $\rightarrow$ **Settings** $\rightarrow$ **Branches**.
2. Click **Add branch ruleset** (or **Add branch protection rule**).
3. Target: `main`.
4. Enable:
   - [x] **Require a pull request before merging**
   - [x] **Require status checks to pass before merging**:
     - Select `Backend Unit, Security & Vault Config Tests`
     - Select `Frontend Lint & Standalone Build Check`
     - Select `Secret Leak Detection`
   - [x] **Do not allow bypassing the above settings**
5. Save changes.

---

## 5. How Releases Work

1. You create a signed Git tag and push it:
   ```bash
   git tag -a v3.1.0 -m "Release v3.1.0"
   git push origin v3.1.0
   ```
2. The `.github/workflows/release.yml` workflow fires:
   - Compiles tests.
   - Builds multi-arch ARM64 images.
   - Scans with Trivy for CVEs.
   - Pushes immutable images with commit-SHA and tag identifiers.
   - Creates an artifact `release-manifest.json` containing cryptographic `sha256` digests.
