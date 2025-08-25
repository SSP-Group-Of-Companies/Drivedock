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

🚨 **Do not change these ports or URLs.** They are hard-coded into:

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

  - Download from: [https://caddyserver.com/download](https://caddyserver.com/download)
  - You do **not install** Caddy globally. You just download the binary (`caddy.exe` on Windows, `caddy` on macOS/Linux) and run it directly from its folder.

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
AUTH_COOKIE_NAME=   # Cookie name for authentication token
NEXTAUTH_SECRET=

# Portal URL Configuration
NEXT_PUBLIC_PORTAL_BASE_URL=https://sspportal.lvh.me:3443
```

### SSP Portal (`ssp-portal/.env.local`)

```ini
# Where Portal runs
NEXT_PUBLIC_ORIGIN=

# Cookie shared across sub-apps
AUTH_COOKIE_NAME=
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

We ship the **CaddyFile** in DriveDock with both Portal + DriveDock configs included. This way, you only run Caddy **once** to handle HTTPS for both apps.

### Combined `CaddyFile` (in `drivedock/main/CaddyFile`)

```caddyfile
# SSP Portal (HTTPS) → localhost:3000
sspportal.lvh.me:3443 {
    tls internal
    reverse_proxy 127.0.0.1:3000
}

# DriveDock (HTTPS) → localhost:3001
drivedock.sspportal.lvh.me:4443 {
    tls internal
    reverse_proxy 127.0.0.1:3001
}
```

> `lvh.me` always resolves to `127.0.0.1`, so no hosts file changes are needed.

#### Run Caddy

1. Download the Caddy binary from [caddyserver.com](https://caddyserver.com/download).
2. Open a terminal **in the folder where you downloaded Caddy**.
3. Run it by pointing to the DriveDock CaddyFile:

**Windows (PowerShell / CMD)**

```powershell
.\caddy.exe run --config "C:\Users\Ridoy\projects\Drivedock\main\CaddyFile"
```

**macOS/Linux**

```bash
./caddy run --config ~/projects/Drivedock/main/CaddyFile
```

This single Caddy process will serve HTTPS for **both SSP Portal and DriveDock**.

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
- **Cookie not present in DriveDock**: Ensure you first authenticate at the Portal URL (same browser/profile). Confirm Caddy is running with both configs.
- **Mixed content / wrong origin**: Always use the HTTPS `lvh.me` URLs, never `http://localhost:*` directly in the browser.

---

## 8) Why this setup?

- Auth relies on **exact origins**. Using `lvh.me` subdomains lets us mirror production cookie and redirect behavior locally.
- Caddy provides **HTTPS** and **subdomains** so Azure AD redirects and SameSite cookie rules behave.
- A single Caddy config handles **both apps at once**, reducing terminal clutter.
- Keeping **fixed ports** allows env defaults, callback URLs, and docs to stay in sync across all devs.

---

## 9) Quick Checklist (TL;DR)

- [ ] `npm install` in **both** repos
- [ ] `.env.local` files retrieved from a teammate (do not guess values)
- [ ] Caddy downloaded from [caddyserver.com](https://caddyserver.com/download) and run with DriveDock’s combined `CaddyFile` (Portal @ 3443 → :3000, DriveDock @ 4443 → :3001)
- [ ] `npm run dev` in **both** apps
- [ ] Open Portal → login → cookie set
- [ ] Open DriveDock → sees cookie → logout hits Portal

If all boxes are checked, you’re good to develop in DriveDock with working SSO.
