// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { AUTH_COOKIE_NAME, DISABLE_AUTH, NEXTAUTH_SECRET, NEXT_PUBLIC_PORTAL_BASE_URL } from "./config/env";

/**
 * Middleware guidelines:
 * - Keep it LIGHT: no DB calls. Use it for UX guards only.
 * - API routes remain the source of truth (requireOnboardingSession).
 * - Forward cookies when fetching internal APIs from middleware.
 */
export async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  // ------------------------------------------------------------
  // Onboarding pages
  // ------------------------------------------------------------
  if (pathname.startsWith("/onboarding/")) {
    // Allow explicit non-ID helper routes
    if (pathname.startsWith("/onboarding/resume")) {
      return NextResponse.next();
    }

    // Parse /onboarding/:id[/...]
    const segments = pathname.split("/").filter(Boolean); // ["onboarding", ":id", maybe "subpath"...]
    const trackerId = segments[1];
    const subPath = segments[2] ?? "";

    // If path doesn't actually include an :id (e.g., /onboarding), let it through
    if (!trackerId) return NextResponse.next();

    // Only run session check when the second segment looks like a Mongo ObjectId
    const looksLikeObjectId = /^[a-f\d]{24}$/i.test(trackerId);
    if (looksLikeObjectId) {
      // 1) DB-backed session check (no page flash)
      try {
        const apiUrl = `${origin}/api/v1/onboarding/${trackerId}/session-check`;
        const sessionRes = await fetch(apiUrl, {
          cache: "no-store",
          headers: { cookie: req.headers.get("cookie") ?? "" }, // forward cookies
        });

        if (!sessionRes.ok) {
          const url = req.nextUrl.clone();
          url.pathname = "/";
          return NextResponse.redirect(url);
        }
      } catch {
        // Fail closed to be strict; if you prefer fail-open, return NextResponse.next()
        const url = req.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }

      // 2) Avoid flash: if already completed, hard redirect to the completed page
      if (subPath !== "completed") {
        try {
          const apiUrl = `${origin}/api/v1/onboarding/${trackerId}/completion-status`;
          const res = await fetch(apiUrl, {
            cache: "no-store",
            headers: { cookie: req.headers.get("cookie") ?? "" },
          });

          // Convention: completion-status returns 200 OK when completed
          if (res.ok) {
            return NextResponse.redirect(new URL(`/onboarding/${trackerId}/completed`, req.url));
          }
        } catch {
          // Fail open — let the page render if the check fails for any reason
        }
      }
    }

    // Allow onboarding routes to continue (API routes enforce real validity)
    return NextResponse.next();
  }

  // ------------------------------------------------------------
  // Dashboard: auth guard (admin side)
  // ------------------------------------------------------------
  if (!DISABLE_AUTH && pathname.startsWith("/dashboard")) {
    const token = await getToken({
      req: req as any,
      secret: NEXTAUTH_SECRET,
      cookieName: AUTH_COOKIE_NAME,
    });

    if (!token) {
      const callbackUrl = encodeURIComponent(`${origin}/dashboard/home`);
      return NextResponse.redirect(`${NEXT_PUBLIC_PORTAL_BASE_URL}/login?callbackUrl=${callbackUrl}`);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};
