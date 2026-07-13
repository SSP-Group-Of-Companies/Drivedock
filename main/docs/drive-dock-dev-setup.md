# DriveDock – Local Development Setup

Local development runs over **plain HTTP on localhost**. There is no reverse proxy or HTTPS terminator (Caddy was removed). Auth and cookie sharing work the same way as in production conceptually: one shared session cookie on hostname `localhost`, readable by every app on that host regardless of port.

DriveDock is a **dependent app** of the SSP Portal. The portal owns Azure sign-in and the shared cookie; DriveDock only consumes them.

For portal-side details, see `SSPPortal/frontend/docs/ssp-portal-dev-setup.md`.

## Layout

| App            | Typical URL             |
| -------------- | ----------------------- |
| **SSP Portal** | `http://localhost:3000` |
| **DriveDock**  | `http://localhost:3001` |

Browsers treat cookies by **hostname**, not port. A session cookie set for `localhost` on port 3000 is therefore available to DriveDock on port 3001.

## Auth flow

```
DriveDock (:3001)            Portal (:3000)              Microsoft Entra
       |                           |                            |
       |  no SSP_AUTH_TOKEN        |                            |
       |  (open /dashboard)        |                            |
       |-------------------------->|  /login?callbackUrl=…      |
       |                           |--------------------------->|
       |                           |<---------------------------|
       |                           |  set SSP_AUTH_TOKEN        |
       |                           |  (Domain=localhost,        |
       |                           |   Secure off for HTTP)     |
       |<--------------------------|  redirect to callbackUrl   |
       |                           |                            |
       |  GET /api/v1/auth/me      |                            |
       |  (Cookie: SSP_AUTH_TOKEN) |                            |
       |-------------------------->|                            |
       |<--------------------------|  user + access.apps        |
       |                           |  (must include "drivedock")|
```

1. User opens DriveDock dashboard at `http://localhost:3001/dashboard/...`.
2. If the shared cookie is missing, middleware redirects to the portal login with a `callbackUrl` back to DriveDock (e.g. `http://localhost:3001/dashboard/home`).
3. User signs in with Microsoft on the portal.
4. Portal sets `SSP_AUTH_TOKEN` for `localhost` (non-Secure so it works on HTTP).
5. Portal redirects to the whitelisted `callbackUrl`.
6. DriveDock reads the JWT from `SSP_AUTH_TOKEN`, then calls `http://localhost:3000/api/v1/auth/me` with that cookie. The response is the source of truth for identity and whether `"drivedock"` is in `access.apps`.
7. A positive access answer is cached briefly in DriveDock’s own `SSP_DD_PORTAL_ACCESS` cookie so the portal is not hit on every navigation.

Driver onboarding routes (`/onboarding/...`) use a separate onboarding session cookie and do **not** go through portal SSO.

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm
- Git
- Both repos cloned side-by-side (DriveDock + SSP Portal)
- `.env.local` for each app (ask a teammate; do not invent secrets)

## Running locally

```bash
# Terminal A – SSP Portal
cd SSPPortal/frontend
npm install
npm run dev          # http://localhost:3000

# Terminal B – DriveDock
cd Drivedock/main
npm install
npm run dev          # http://localhost:3001
```

Open DriveDock at [http://localhost:3001](http://localhost:3001). Unauthenticated dashboard visits redirect to the portal login; after sign-in you should land back on DriveDock authenticated.

## DriveDock env (`.env.local`)

Place at `Drivedock/main/.env.local`. Auth-related values that must match the portal:

```env
# Must match the portal cookie name
AUTH_COOKIE_NAME=SSP_AUTH_TOKEN

# Same secret the portal uses to sign the JWT
NEXTAUTH_SECRET=...

# Portal origin (HTTP in local dev)
NEXT_PUBLIC_PORTAL_BASE_URL=http://localhost:3000
```

Other keys (MongoDB, AWS, encryption, Turnstile, etc.) are app-specific — get a full `.env.local` from a teammate.

### Portal env that DriveDock depends on

On the portal side (`SSPPortal/frontend/.env.local`), these must allow localhost HTTP callbacks and a shared cookie:

```env
NEXT_PUBLIC_ORIGIN=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

AUTH_COOKIE_NAME=SSP_AUTH_TOKEN
AUTH_COOKIE_DOMAIN=localhost

# Must include localhost so DriveDock callbackUrls are accepted
NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS=localhost,...
```

`AUTH_COOKIE_SECURE` is derived in portal code from `NEXT_PUBLIC_ORIGIN`: `http://` → cookies are not Secure; `https://` (production) → Secure.

## What to expect

| Action                                                | Expected result                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Open `http://localhost:3001/dashboard` with no cookie | Redirect to `http://localhost:3000/login?callbackUrl=…`                        |
| Sign in on the portal                                 | Cookie `SSP_AUTH_TOKEN` set for `localhost`; redirect back to DriveDock        |
| Return to DriveDock with access granted               | Dashboard loads; portal `/api/v1/auth/me` shows `"drivedock"` in `access.apps` |
| Signed in but no DriveDock grant                      | Redirect to portal `…/dashboard?denied=drivedock`                              |
| Logout from DriveDock                                 | Goes to portal `/api/auth/logout`, which clears the shared cookie for all apps |

## Troubleshooting

- **Redirect loop / not authenticated** — Confirm both apps are on `localhost` (not `127.0.0.1`), portal is running on `:3000`, and `AUTH_COOKIE_NAME` / `NEXTAUTH_SECRET` match across projects.
- **Land on portal with `denied=drivedock`** — Your Entra user is signed in but not granted the DriveDock app in the portal App Registry. Request access or ask an admin to grant it.
- **Cookie not sent to DriveDock** — Cookie domain must be `localhost` (not a subdomain). Do not mix `http://127.0.0.1` and `http://localhost`.
- **Azure redirect mismatch** — Local Azure AD redirect URI is the **portal** callback (`http://localhost:3000/api/auth/callback/azure-ad`), not DriveDock. DriveDock never talks to Entra directly for dashboard SSO.

## Production note

In production the portal and DriveDock sit on real HTTPS hosts. The same cookie-sharing idea applies via a shared parent domain (`AUTH_COOKIE_DOMAIN`) and Secure cookies. Locally, hostname `localhost` + HTTP replaces that setup.
