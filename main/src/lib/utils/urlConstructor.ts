// lib/utils/urlConstructor.ts
import { isProd, PORT } from "@/config/env";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

/** Trim a trailing slash, if present. */
function trimSlash(url: string) {
  return url.replace(/\/+$/, "");
}

/**
 * Public base URL for this app.
 *
 * Use for:
 * - SSO / OAuth redirect URIs
 * - Links visible to the browser (emails, redirects, etc.)
 *
 * Behavior:
 * - Client: window.location.origin
 * - Server: reconstruct from x-forwarded-proto + host (works behind proxy/CDN)
 */
export async function resolveBaseUrl(): Promise<string> {
  if (typeof window !== "undefined") {
    return trimSlash(window.location.origin);
  }
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

/**
 * Internal base URL for **server-to-server** calls within this app.
 *
 * Use for:
 * - Server Components / Route Handlers calling your own API routes in **development**
 * - Bypassing TLS/Caddy and talking directly to the Next dev server
 *
 * Behavior:
 * - Dev:  http://127.0.0.1:{PORT}  (PORT is set by `next dev -p 3001`)
 * - Prod: same as resolveBaseUrl() (no local dev server in production)
 *
 * NOTE: This is **server-only**. Do not call from client code.
 */
export async function resolveInternalBaseUrl(): Promise<string> {
  if (typeof window !== "undefined") throw new Error("resolveInternalBaseUrl() is server-only");

  if (!isProd) return `http://127.0.0.1:${PORT}`;

  // In prod, internal == public
  return await resolveBaseUrl();
}

/** When inside a Route Handler and you *have* a NextRequest. */
export function resolveBaseUrlFromRequest(req: NextRequest): string {
  return req.nextUrl.origin;
}
