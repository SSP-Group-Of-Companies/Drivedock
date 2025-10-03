// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { AUTH_COOKIE_NAME, DISABLE_AUTH, NEXTAUTH_SECRET, NEXT_PUBLIC_PORTAL_BASE_URL } from "./config/env";
import type { EStepPath } from "@/types/onboardingTracker.types";

/**
 * Middleware guidelines:
 * - Keep it LIGHT: no DB calls. Use it for UX guards only.
 * - API routes remain the source of truth (requireOnboardingSession).
 * - Forward cookies when fetching internal APIs from middleware.
 */
export async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  // ------------------------------------------------------------
  // Onboarding pages (driver side)
  // ------------------------------------------------------------
  if (pathname.startsWith("/onboarding/")) {
    // Allow explicit helper route (/onboarding/resume)
    if (pathname === "/onboarding/resume") {
      return NextResponse.next();
    }

    // Parse /onboarding/:id[/...]
    const segments = pathname.split("/").filter(Boolean); // ["onboarding", ":id", maybe "subpath"...]
    const trackerId = segments[1];
    const subPath = segments[2] ?? ""; // "pending-approval" | "completed" | step (e.g. "application-form/page-2")

    // No :id → let pass (e.g., /onboarding)
    if (!trackerId) return NextResponse.next();

    // Only run checks when the second segment looks like an ObjectId
    const looksLikeObjectId = /^[a-f\d]{24}$/i.test(trackerId);
    if (looksLikeObjectId) {
      // Consolidated guard call
      let guardOk = false;
      let guard: {
        completed: boolean;
        invitationApproved: boolean;
        sessionOk: boolean;
        tracker?: {
          id: string;
          needsFlatbedTraining: boolean;
          status: { currentStep: EStepPath; completed: boolean };
        };
      } | null = null;

      try {
        const guardUrl = `${origin}/api/v1/onboarding/${trackerId}/guard`;
        const guardRes = await fetch(guardUrl, {
          cache: "no-store",
          // Forward cookies if present; the rule below allows completed access without session,
          // but the guard endpoint should still be able to tell us if it's completed.
          headers: { cookie: req.headers.get("cookie") ?? "" },
        });

        guardOk = guardRes.ok;
        if (guardOk) {
          const json = await guardRes.json();
          guard = json?.data ?? null;
        }
      } catch {
        // network error — treat as not ok
      }

      // Guard failed → home (we can't confidently evaluate completion/session)
      if (!guardOk || !guard) {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }

      const { completed, invitationApproved, sessionOk } = guard;

      // =========================================================
      // NEW RULE: Completed pages don't need session
      // - If onboarding is completed:
      //   * Any subpath → redirect to /completed (canonical)
      //   * If already on /completed → allow (no session required)
      // =========================================================
      if (completed) {
        if (subPath === "completed") {
          // Already on the canonical completed page → allow access w/o session
          return NextResponse.next();
        }
        // Force canonical /completed when done
        return NextResponse.redirect(new URL(`/onboarding/${trackerId}/completed`, req.url));
      }

      // =========================
      // NOT COMPLETED YET
      // =========================

      // 🔒 Global rule for NOT-COMPLETED: ALL onboarding pages require a session
      // (including /completed and /pending-approval when not completed)
      if (!sessionOk) {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }

      // -------------------------
      // NOT APPROVED YET
      // -------------------------
      if (!invitationApproved) {
        // Has session (enforced above) → force [id]/pending-approval from ANY subpath
        if (subPath !== "pending-approval") {
          return NextResponse.redirect(new URL(`/onboarding/${trackerId}/pending-approval`, req.url));
        }
        // Already on [id]/pending-approval with valid session → allow
        return NextResponse.next();
      }

      // -------------------------
      // APPROVED (but not completed)
      // -------------------------

      // If on [id]/pending-approval and approved but not completed:
      // allow (client shows success/links)
      if (subPath === "pending-approval") {
        return NextResponse.next();
      }

      // Otherwise, for approved & not completed, allow access to the rest.
    }

    // Allow onboarding routes to continue (API routes enforce validity)
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
