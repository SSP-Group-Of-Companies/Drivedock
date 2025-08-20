// lib/utils/siteUrl.ts
import { NextRequest } from "next/server";

export function getSiteUrl(req: NextRequest): string {
  // NextRequest.url contains the full incoming URL (including protocol + host)
  const { origin } = new URL(req.url);
  return origin;
}

/**
 * Resolves the base URL for API requests.
 *
 * - In production: always uses NEXT_PUBLIC_BASE_URL
 * - In development: prefers NEXT_PUBLIC_INTERNAL_BASE_URL (if set),
 *   otherwise falls back to NEXT_PUBLIC_BASE_URL
 */
export function resolveBaseUrl(): string {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    return process.env.NEXT_PUBLIC_BASE_URL ?? "";
  }

  return process.env.NEXT_PUBLIC_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";
}
