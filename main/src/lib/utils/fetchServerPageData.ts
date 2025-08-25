// lib/utils/fetchServerPageData.ts
import "server-only";
import { cookies } from "next/headers";
import { ensureLeadingSlash, isAbsoluteUrl, trimTrailingSlash } from "./urlHelper";
import { getCurrentOrigin } from "./urlHelper.server";

/** Standard result shape for server page data fetches. */
export type ServerPageDataResult<T> = { data?: T; error?: string };

/** Minimal Next.js `next` config typing to avoid importing framework types. */
type NextFetchConfig = {
  revalidate?: number | false;
  tags?: string[];
};

/** RequestInit with Next.js extensions. (Uses global DOM types) */
export type ServerFetchInit = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
  next?: NextFetchConfig;
};

function isJsonResponse(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.toLowerCase().includes("application/json");
}

async function toAbsoluteUrlIfNeeded(url: string): Promise<string> {
  if (isAbsoluteUrl(url)) return url;
  const origin = await getCurrentOrigin();
  return trimTrailingSlash(origin) + ensureLeadingSlash(url);
}

async function isSameOrigin(absoluteUrl: string): Promise<boolean> {
  try {
    const u = new URL(absoluteUrl);
    const origin = await getCurrentOrigin();
    const o = new URL(origin);
    return u.protocol === o.protocol && u.host === o.host;
  } catch {
    return false;
  }
}

/**
 * Server-only helper for Server Components.
 * - Accepts absolute URLs, or relative ("/api/...") and resolves to absolute.
 * - Auto-forwards cookies for same-origin requests (Vercel preview protection).
 * - Safe defaults: Accept JSON, no-store (unless caller sets cache/revalidate), redirect: "manual".
 * - Returns `{ data, error }`, unwrapping `{ data: ... }` if present.
 */
export async function fetchServerPageData<T = unknown>(inputUrl: string, init: ServerFetchInit = {}): Promise<ServerPageDataResult<T>> {
  try {
    const url = await toAbsoluteUrlIfNeeded(inputUrl);
    const sameOrigin = await isSameOrigin(url);

    const callerControlsCaching = init.cache !== undefined || init.next?.revalidate !== undefined;

    const defaultInit: ServerFetchInit = {
      redirect: "manual",
      headers: { Accept: "application/json" },
      ...(callerControlsCaching ? {} : { cache: "no-store" }),
    };

    // Merge headers and forward cookies if same-origin (unless caller already set cookie)
    const defaultHeaders = new Headers(defaultInit.headers as HeadersInit);
    const callerHeaders = new Headers(init.headers || {});
    if (sameOrigin && !callerHeaders.has("cookie")) {
      const cookieStr = cookies().toString();
      if (cookieStr) defaultHeaders.set("cookie", cookieStr);
    }

    const merged: RequestInit = {
      ...defaultInit,
      ...init,
      headers: {
        ...Object.fromEntries(defaultHeaders.entries()),
        ...Object.fromEntries(callerHeaders.entries()),
      },
    };

    const res = await fetch(url, merged);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location") || "(unknown)";
      return { error: `Unexpected redirect (${res.status}) to ${location}.` };
    }

    if (!res.ok) {
      if (isJsonResponse(res)) {
        const errJson = (await res.json().catch(() => null)) as any;
        const msg = (errJson && (errJson.message || errJson.error)) || `Request failed with ${res.status}`;
        return { error: msg };
      } else {
        await res.text().catch(() => "");
        return { error: `Request failed with ${res.status}. Received non-JSON response.` };
      }
    }

    if (!isJsonResponse(res)) {
      await res.text().catch(() => "");
      return { error: "Expected JSON but received non-JSON response." };
    }

    const json = (await res.json().catch(() => null)) as any;
    if (json == null) return { error: "Empty JSON response." };

    const payload = (Object.prototype.hasOwnProperty.call(json, "data") ? json.data : json) as T;
    return { data: payload };
  } catch (err) {
    console.error("[fetchServerPageData] Unexpected error:", err);
    return { error: "Unexpected server error. Please try again later." };
  }
}
