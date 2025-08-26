// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { AUTH_COOKIE_NAME, DISABLE_AUTH, NEXTAUTH_SECRET, NEXT_PUBLIC_PORTAL_BASE_URL } from "./config/env";
import { resolveBaseUrl } from "./lib/utils/urlHelper.server";

export async function middleware(req: NextRequest) {
  // If auth disabled, allow all
  if (DISABLE_AUTH) {
    return NextResponse.next();
  }

  // Normal auth check
  const token = await getToken({
    req: req as any,
    secret: NEXTAUTH_SECRET,
    cookieName: AUTH_COOKIE_NAME,
  });

  if (!token) {
    const base = await resolveBaseUrl();
    const callbackUrl = encodeURIComponent(base);
    return NextResponse.redirect(`${NEXT_PUBLIC_PORTAL_BASE_URL}/login?callbackUrl=${callbackUrl}`);
  }

  return NextResponse.next();
}

// Apply to all routes you want guarded
export const config = {
  matcher: ["/dashboard/:path*"],
};
