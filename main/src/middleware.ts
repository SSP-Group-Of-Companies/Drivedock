// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { COOKIE_NAME, NEXT_PUBLIC_BASE_URL, NEXTAUTH_SECRET, PORTAL_BASE_URL } from "./config/env";

export async function middleware(req: NextRequest) {
  // Only runs for /dashboard/* (see matcher below)
  const token = await getToken({ req: req as any, secret: NEXTAUTH_SECRET, cookieName: COOKIE_NAME });
  if (!token) {
    const callbackUrl = encodeURIComponent(NEXT_PUBLIC_BASE_URL);
    return NextResponse.redirect(`${PORTAL_BASE_URL}/login?callbackUrl=${callbackUrl}`);
  }
  return NextResponse.next();
}

// Only require auth for /dashboard routes
export const config = {
  matcher: ["/dashboard/:path*"],
};
