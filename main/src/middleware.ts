// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { AUTH_COOKIE_NAME, DISABLE_AUTH, NEXTAUTH_SECRET, NEXT_PUBLIC_PORTAL_BASE_URL } from "./config/env";
import { resolveBaseUrl, resolveBaseUrlFromRequest } from "./lib/utils/urlHelper.server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Onboarding flow: hard redirect to completed page when status.completed = true
  // This prevents a brief flash of in-progress pages on reload
  if (pathname.startsWith("/onboarding/")) {
    try {
      // Extract trackerId from /onboarding/:id/... path
      const parts = pathname.split("/");
      const trackerId = parts[2];
      const subPath = parts[3] ?? "";

      // Skip redirect for the completed page itself
      if (trackerId && subPath !== "completed") {
        const base = resolveBaseUrlFromRequest(req);
        const url = `${base}/api/v1/onboarding/${trackerId}/completion-status`;

        // Use no-store to avoid any caching between edge and origin
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          return NextResponse.redirect(new URL(`/onboarding/${trackerId}/completed`, req.url));
        }
      }
    } catch {
      // Fail open – allow normal rendering if check errors
    }
    // Allow onboarding routes to continue without auth
    return NextResponse.next();
  }

  // Dashboard: auth guard
  if (!DISABLE_AUTH && pathname.startsWith("/dashboard")) {
    const token = await getToken({
      req: req as any,
      secret: NEXTAUTH_SECRET,
      cookieName: AUTH_COOKIE_NAME,
    });

    if (!token) {
      const base = await resolveBaseUrl();
      const callbackUrl = encodeURIComponent(`${base}/dashboard/home`);
      return NextResponse.redirect(`${NEXT_PUBLIC_PORTAL_BASE_URL}/login?callbackUrl=${callbackUrl}`);
    }
  }

  return NextResponse.next();
}

// Apply to all routes you want guarded
export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};
