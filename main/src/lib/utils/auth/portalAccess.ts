// src/lib/utils/auth/portalAccess.ts
//
// Portal-issued app access for DriveDock.
//
// The SSP Portal is the platform control plane: it owns the user directory
// and decides which internal apps a person may open (App Registry + grants +
// Entra groups). DriveDock enforces that decision by calling the portal's
// versioned /api/v1/auth/me contract with the shared session cookie and
// requiring "drivedock" in the returned access list.
//
// To keep navigation fast, a positive answer is cached in a short-lived
// HMAC-signed cookie bound to the user's Azure object id, so the portal is
// consulted at most once per PORTAL_ACCESS_TTL_SECONDS per user. Access
// revocations on the portal therefore take effect within the same window.
//
// NOTE: no "server-only" import here — this module must run in both the edge
// middleware and node API guards, so it uses Web Crypto exclusively.

import { NEXTAUTH_SECRET, NEXT_PUBLIC_PORTAL_BASE_URL } from "@/config/env";

/** App Registry key for this application (never changes). */
export const PORTAL_APP_KEY = "drivedock";

/** Short-lived signed cookie holding a positive portal access answer. */
export const PORTAL_ACCESS_COOKIE = "SSP_DD_PORTAL_ACCESS";
export const PORTAL_ACCESS_TTL_SECONDS = 5 * 60;

// ---------------------------------------------------------------------------
// HMAC helpers (Web Crypto — available in edge middleware and Node 18+)
// ---------------------------------------------------------------------------

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(NEXTAUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64url(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Mint the signed access cookie value: "<exp>.<hmac(exp + azureId)>". */
export async function mintPortalAccessCookie(azureId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + PORTAL_ACCESS_TTL_SECONDS;
  const sig = await hmacSign(`${exp}.${azureId}`);
  return `${exp}.${sig}`;
}

/** Verify the cookie is unexpired, untampered, and bound to this user. */
export async function verifyPortalAccessCookie(value: string | undefined, azureId: string): Promise<boolean> {
  if (!value || !azureId) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const expStr = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmacSign(`${expStr}.${azureId}`);
  return timingSafeEqual(sig, expected);
}

// ---------------------------------------------------------------------------
// Portal contract call
// ---------------------------------------------------------------------------

export interface PortalAccessResult {
  /** True when the portal says this user may open DriveDock. */
  ok: boolean;
  /** HTTP status from the portal; 0 on network failure (fail closed). */
  status: number;
}

/**
 * Ask the portal who this user is and whether DriveDock is in their access
 * list. `cookieHeader` must carry the shared SSP session cookie.
 */
export async function checkPortalAccess(cookieHeader: string): Promise<PortalAccessResult> {
  try {
    const res = await fetch(`${NEXT_PUBLIC_PORTAL_BASE_URL}/api/v1/auth/me`, {
      cache: "no-store",
      headers: { cookie: cookieHeader },
    });
    if (!res.ok) return { ok: false, status: res.status };
    const json = await res.json();
    const apps: unknown = json?.access?.apps;
    return { ok: Array.isArray(apps) && apps.includes(PORTAL_APP_KEY), status: res.status };
  } catch (err) {
    console.error("[portalAccess] portal unreachable:", err);
    return { ok: false, status: 0 };
  }
}
