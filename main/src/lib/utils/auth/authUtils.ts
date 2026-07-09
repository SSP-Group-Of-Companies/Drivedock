// src/lib/utils/auth/authUtils.ts
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { IUser } from "@/types/user.types";
import { AppError } from "@/lib/utils/apiResponse";
import { AUTH_COOKIE_NAME, DISABLE_AUTH, NEXTAUTH_SECRET } from "@/config/env";
import { PORTAL_ACCESS_COOKIE, checkPortalAccess, verifyPortalAccessCookie } from "@/lib/utils/auth/portalAccess";

interface AppJWT {
  userId?: string;
  email?: string;
  name?: string;
  picture?: string;
  // roles?: string[];
}

/**
 * Builds a minimal NextRequest carrying the cookie header,
 * so `getToken` can correctly parse the session token in App Router.
 */
async function buildNextRequest(): Promise<NextRequest> {
  const jar = await cookies();
  const cookieHeader = jar
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  const headers = new Headers();
  if (cookieHeader) headers.set("cookie", cookieHeader);
  return new NextRequest("https://internal.local/", { headers });
}

/**
 * Returns the currently authenticated user from the session token.
 * - Reads cookies via `cookies()`
 * - Uses `getToken` from NextAuth to verify/decode the JWT
 * - Returns a strongly typed `IUser` object or `null`
 */
export const currentUser = cache(async (): Promise<IUser | null> => {
  const jar = await cookies();
  const raw = jar.get(AUTH_COOKIE_NAME)?.value;
  if (!raw) return null;

  const req = await buildNextRequest();
  const token = (await getToken({
    req,
    secret: NEXTAUTH_SECRET,
    cookieName: AUTH_COOKIE_NAME,
  })) as AppJWT | null;

  if (!token?.userId || !token?.email || !token?.name) return null;
  const user = {
    id: token.userId,
    email: token.email,
    name: token.name,
    picture: token.picture,
  };
  return user;
});

/**
 * Guard method: ensures a user is authenticated AND allowed into DriveDock.
 * - Calls `currentUser` (shared SSP session cookie)
 * - Enforces portal-granted app access: the SSP Portal's App Registry
 *   (grants + Entra groups) decides who may use DriveDock. The middleware
 *   caches a positive answer in a short-lived signed cookie; when that
 *   cookie is absent (e.g. direct API calls) we ask the portal directly.
 * - Throws `AppError(401)` if unauthenticated, `AppError(403)` if the
 *   portal has not granted this user DriveDock access
 * - returns null user if DISABLE_AUTH env is set to true
 */
export const guard = cache(async (): Promise<IUser | null> => {
  if (DISABLE_AUTH) return null;
  const user = await currentUser();
  if (!user) throw new AppError(401, "Unauthenticated");

  const jar = await cookies();
  const cachedAccess = jar.get(PORTAL_ACCESS_COOKIE)?.value;
  if (await verifyPortalAccessCookie(cachedAccess, user.id)) return user;

  const cookieHeader = jar
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  const access = await checkPortalAccess(cookieHeader);
  if (!access.ok) {
    throw new AppError(403, "DriveDock access has not been granted to this account. Request access from the SSP Portal.");
  }
  return user;
});
