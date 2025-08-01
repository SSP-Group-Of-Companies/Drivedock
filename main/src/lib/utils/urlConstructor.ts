// lib/utils/siteUrl.ts
import { NextRequest } from "next/server";

export function getSiteUrl(req: NextRequest): string {
  // NextRequest.url contains the full incoming URL (including protocol + host)
  const { origin } = new URL(req.url);
  return origin;
}
