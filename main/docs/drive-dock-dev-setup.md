# DriveDock – Local Development **Quick Start** (with SSP Portal Auth)

> **Goal:** Get DriveDock running locally **with working SSO** via the SSP Portal. Follow the steps below **in order**. After that, you’ll find detailed context and FAQs.

---

## ✅ 0) Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm** (or pnpm/yarn if you prefer — examples use npm)
- **Git**
- **Caddy** (local HTTPS reverse proxy). Download **the binary** for your OS from [https://caddyserver.com/download](https://caddyserver.com/download) and place it somewhere convenient. **No global install needed.**

> **Note:** The downloaded Caddy file may not be named exactly `caddy` or `caddy.exe`. For convenience, **rename it to `caddy.exe` (Windows)** or `caddy` (macOS/Linux) so you can run the same commands shown below.

> **Note:** We use `lvh.me` subdomains (they resolve to `127.0.0.1`) so cookies and redirects behave like prod.

---

## 🚀 1) Clone the repos (side‑by‑side)

```
<workspace>
├─ drivedock/
└─ ssp-portal/
```

```bash
# In <workspace>
# (clone however you normally do; sample below)

git clone <DRIVEDOCK_REPO_URL> drivedock
git clone <SSP_PORTAL_REPO_URL> ssp-portal
```

---

## 🔑 2) Get environment files

Ask a teammate/lead for the **`.env.local`** for **both** projects and put them here:

- `drivedock/.env.local`
- `ssp-portal/.env.local`

> These contain secrets (MongoDB, Azure AD, etc.). **Do not** guess or check in.

---

## 📦 3) Install dependencies

```bash
# Terminal A – SSP Portal
cd ssp-portal
npm install

# Terminal B – DriveDock
cd ../drivedock
npm install
```

---

## 🧰 4) Run Caddy (HTTPS + subdomains)

We ship a **combined** CaddyFile in DriveDock that proxies both apps:

**`drivedock/main/CaddyFile`**

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

**Run it from the folder where you downloaded Caddy:**

- **Windows (PowerShell/CMD)**

```powershell
.\caddy.exe run --config "C:\\Users\\Ridoy\\projects\\Drivedock\\main\\CaddyFile"
```

- **macOS/Linux**

```bash
./caddy run --config ~/projects/Drivedock/main/CaddyFile
```

> Keep this terminal **open**. Caddy now serves HTTPS for **both** apps.

---

## ▶️ 5) Start the apps

Open two terminals:

```bash
# Terminal A – SSP Portal
cd ssp-portal
npm run dev  # runs on :3000

# Terminal B – DriveDock
cd drivedock
npm run dev  # runs on :3001
```

---

## 🔍 6) Sanity check (auth works)

1. Go to **Portal**: [https://sspportal.lvh.me:3443](https://sspportal.lvh.me:3443)

   - Log in. You should see the portal home and a cookie set.

2. Go to **DriveDock**: [https://drivedock.sspportal.lvh.me:4443](https://drivedock.sspportal.lvh.me:4443)

   - DriveDock should detect the Portal cookie. Logout in DriveDock should hit Portal logout.

If DriveDock says “not authenticated”, re‑check you’re visiting the **HTTPS** subdomain URLs and that Caddy is running.

---

# 📘 Details & Reference

## ⚠️ Fixed Ports & URLs (Do **not** change)

- **SSP Portal**

  - Local dev: `http://localhost:3000`
  - Public HTTPS: `https://sspportal.lvh.me:3443`

- **DriveDock**

  - Local dev: `http://localhost:3001`
  - Public HTTPS: `https://drivedock.sspportal.lvh.me:4443`

These values are hard‑wired into **Azure AD redirect URIs**, cookie domain/subdomain behavior, and example `.env` values. Changing ports breaks auth.

**`package.json` scripts (verify but don’t change):**

**Portal**

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

**DriveDock**

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

## Why HTTPS + subdomains + Caddy?

- Azure AD only allows **`http://localhost`** as insecure redirects; custom subdomains must be **HTTPS**.
- We need **subdomains** so cookies can be shared across apps (Portal ↔ DriveDock) and to mirror production origin rules.
- Caddy terminates TLS locally and maps:

  - `https://sspportal.lvh.me:3443` → `http://127.0.0.1:3000`
  - `https://drivedock.sspportal.lvh.me:4443` → `http://127.0.0.1:3001`

## Final URLs (what you should end up with)

| App        | Public URL (HTTPS)                        | Proxied to local dev server |
| ---------- | ----------------------------------------- | --------------------------- |
| SSP Portal | `https://sspportal.lvh.me:3443`           | `http://127.0.0.1:3000`     |
| DriveDock  | `https://drivedock.sspportal.lvh.me:4443` | `http://127.0.0.1:3001`     |

## Example `.env.local` values

### DriveDock (`drivedock/.env.local`)

```ini
# MongoDB
MONGO_URI=

# Session/Token
FORM_RESUME_EXPIRES_AT_IN_MILSEC=
HASH_SECRET=

# Encryption & Cron
ENC_KEY=
CRON_SECRET=

# AWS
AWS_BUCKET_NAME=
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Auth
AUTH_COOKIE_NAME=
NEXTAUTH_SECRET=

# Portal base (for auth routing)
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

# Allowed callback hosts (comma-separated)
NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS=
```

## Troubleshooting

- **TLS warning:** Caddy uses an internal CA. Trust its root (path shown on first run) or bypass once.
- **Ports in use:** Free 3000/3001 and 3443/4443. Don’t change ports.
- **AADSTS50011 (redirect URI mismatch):** Azure AD must list `https://sspportal.lvh.me:3443/api/auth/callback/azure-ad` exactly.
- **No cookie in DriveDock:** Log in at Portal URL first (same browser/profile) and ensure Caddy is running with the combined config.
- **Mixed content/origin:** Always use the **HTTPS** `lvh.me` URLs; **don’t** hit `http://localhost:*` directly.

## TL;DR Checklist

- [ ] `npm install` in **both** repos
- [ ] Place **`.env.local`** in `drivedock/` and `ssp-portal/`
- [ ] Run **Caddy** with `drivedock/main/CaddyFile`
- [ ] `npm run dev` in **both** apps
- [ ] Login at **Portal** → cookie set
- [ ] Open **DriveDock** → authenticated; logout redirects to Portal

---

If the quick start works, you’re ready to build DriveDock with working SSO locally. The sections above explain _why_ this setup is required and where each value comes from.
