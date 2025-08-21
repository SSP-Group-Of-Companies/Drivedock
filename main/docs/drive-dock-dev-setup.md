# DriveDock – Local Development Setup (with SSP Portal Auth)

> **Purpose**: Get DriveDock running locally with **working SSO/auth** via the SSP Portal. In dev, **DriveDock must talk to SSP Portal** for authentication, using HTTPS subdomains that match Azure AD redirect URIs.

---

## ⚠️ Port & URL Requirements (Read First!)

- **SSP Portal must always run on:**

  - Local dev server: `http://localhost:3000`
  - Public HTTPS URL (via Caddy): `https://sspportal.lvh.me:3443`

- **DriveDock must always run on:**

  - Local dev server: `http://localhost:3001`
  - Public HTTPS URL (via Caddy): `https://drivedock.sspportal.lvh.me:4443`

🚨 **Do not change these ports or URLs.** They are hard‑coded into:

- Azure AD redirect URIs
- Cookie domain/subdomain sharing
- Local `.env` values
- Caddy proxy configs

If you run on different ports, **authentication will fail**.

---

## Why HTTPS + Caddy is required

- Azure AD **only allows `http://localhost`** as an insecure redirect URI. It does **not** allow custom subdomains over plain HTTP.
- We need both **HTTPS** and **subdomains** to:

  - Match production redirect URIs (Azure AD requirement).
  - Allow cookie sharing between subdomains (Portal + DriveDock).

- Running Portal at `http://localhost:3000` would prevent cookies from being shared with DriveDock (`http://localhost:3001`).
- With Caddy, we simulate:

  - `https://sspportal.lvh.me:3443` → Portal (3000)
  - `https://drivedock.sspportal.lvh.me:4443` → DriveDock (3001)

This ensures auth and logout flows behave identically to production.

---

## Final URLs (what you should end up with)

| App        | Public URL (HTTPS)                        | Proxied to local dev server |
| ---------- | ----------------------------------------- | --------------------------- |
| SSP Portal | `https://sspportal.lvh.me:3443`           | `http://127.0.0.1:3000`     |
| DriveDock  | `https://drivedock.sspportal.lvh.me:4443` | `http://127.0.0.1:3001`     |

---

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm** or **pnpm** (team defaults to npm unless specified)
- **Git**
- **Caddy** (local reverse proxy + HTTPS)

  - Windows: download the release zip from [https://caddyserver.com/download](https://caddyserver.com/download)
  - macOS: `brew install caddy`
  - Linux: follow distro instructions at [https://caddyserver.com/docs/install](https://caddyserver.com/docs/install)

---

## 1) Clone & Install

Clone both repos side-by-side (recommended):

```
<workspace>
├─ drivedock/
└─ ssp-portal/
```

In each repo, install dependencies:

```bash
# In ssp-portal
npm install

# In drivedock
npm install
```

---

## 2) Environment Variables

Contact another developer or team lead to obtain the required `.env.local` files for both DriveDock and SSP Portal. These contain sensitive credentials and are not checked into Git.

### DriveDock (`drivedock/.env.local`)

```ini
# MongoDB Configuration
MONGO_URI=

# Session and Token Settings
FORM_RESUME_EXPIRES_AT_IN_MILSEC=   # Duration for form resume expiration in milliseconds (2 weeks)
HASH_SECRET=

# Encryption and Security Keys
ENC_KEY=
CRON_SECRET=

# AWS Configuration
AWS_BUCKET_NAME=
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Authentication Configuration
COOKIE_NAME=   # Cookie name for authentication token
NEXTAUTH_SECRET=

# Portal URL Configuration
NEXT_PUBLIC_PORTAL_BASE_URL=https://sspportal.lvh.me:3443
```

### SSP Portal (`ssp-portal/.env.local`)

```ini
# Where Portal runs
NEXT_PUBLIC_ORIGIN=

# Cookie shared across sub-apps
COOKIE_NAME=
COOKIE_DOMAIN=

# NextAuth
NEXTAUTH_URL=https://sspportal.lvh.me:3443
NEXTAUTH_SECRET=

# Azure AD
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=

# Allowed callback hosts
NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS=
```

---

## 3) Verify dev ports (do not change)

**SSP Portal `package.json`**

```json
{
  "scripts": {
    "dev": "next dev --turbopack -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

**DriveDock `package.json`**

```json
{
  "scripts": {
    "dev": "next dev --turbopack -p 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

> **Important**: If you change these ports, cookies/redirects will break. **Don’t.**

---

## 4) Caddy (local HTTPS + subdomains)

We ship a `Caddyfile` in each repo. **Use them without edits.**

### SSP Portal `Caddyfile`

```caddyfile
sspportal.lvh.me:3443 {
    tls internal
    reverse_proxy 127.0.0.1:3000
}
```

### DriveDock `Caddyfile`

```caddyfile
drivedock.sspportal.lvh.me:4443 {
    tls internal
    reverse_proxy 127.0.0.1:3001
}
```

> `lvh.me` always resolves to `127.0.0.1`, so no hosts file changes are needed.

#### Run Caddy

From each repo’s `caddy/` folder (or wherever the `caddy.exe`/binary and `Caddyfile` are placed):

**Windows (PowerShell / CMD)**

```powershell
# In ssp-portal/caddy
./caddy.exe run --config Caddyfile

# In drivedock/caddy
./caddy.exe run --config Caddyfile
```

**macOS/Linux**

```bash
# In ssp-portal/caddy
caddy run --config Caddyfile

# In drivedock/caddy
caddy run --config Caddyfile
```

Leave both Caddy processes running.

---

## 5) Start the apps

In separate terminals:

```bash
# Terminal A – SSP Portal
cd ssp-portal
npm run dev

# Terminal B – DriveDock
cd drivedock
npm run dev
```

---

## 6) Sanity checks

1. Visit **Portal**: [https://sspportal.lvh.me:3443](https://sspportal.lvh.me:3443)

   - Should render the Portal login/home.
   - Login should complete and set the auth cookie.

2. Visit **DriveDock**: [https://drivedock.sspportal.lvh.me:4443](https://drivedock.sspportal.lvh.me:4443)

   - DriveDock should detect the Portal-issued cookie.
   - The **Logout** link in DriveDock must trigger a GET to the Portal’s logout endpoint.

> If DriveDock shows "not authenticated", ensure your browser has the Portal cookie and that the DriveDock app is reading it correctly.

---

## 7) Troubleshooting

- **TLS/Certificate warnings**: Caddy uses an internal CA. Trust its root cert (Caddy prints its path on first run) or proceed past the browser warning during initial setup.
- **Port already in use**: Stop whatever is bound to 3000/3001, 3443/4443. Do **not** change our dev ports.
- **Redirect URI mismatch (AADSTS50011)**: Your Azure AD app must list `https://sspportal.lvh.me:3443/api/auth/callback/azure-ad` exactly.
- **Cookie not present in DriveDock**: Ensure you first authenticate at the Portal URL (same browser/profile). Confirm both Caddy proxies are running.
- **Mixed content / wrong origin**: Always use the HTTPS `lvh.me` URLs, never `http://localhost:*` directly in the browser.

---

## 8) Why this setup?

- Auth relies on **exact origins**. Using `lvh.me` subdomains lets us mirror production cookie and redirect behavior locally.
- Caddy provides **HTTPS** and **subdomains** so Azure AD redirects and SameSite cookie rules behave.
- Keeping **fixed ports** allows env defaults, callback URLs, and docs to stay in sync across all devs.

---

## 9) Quick Checklist (TL;DR)

- [ ] `npm install` in **both** repos
- [ ] `.env.local` files retrieved from a teammate (do not guess values)
- [ ] Caddy running with the provided `Caddyfile`s (Portal @ 3443 → :3000, DriveDock @ 4443 → :3001)
- [ ] `npm run dev` in **both** apps
- [ ] Open Portal → login → cookie set
- [ ] Open DriveDock → sees cookie → logout hits Portal

If all boxes are checked, you’re good to develop in DriveDock with working SSO.
