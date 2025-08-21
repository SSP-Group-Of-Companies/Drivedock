import "server-only";

/** Standard result shape for server page data fetches. */
export type ServerPageDataResult<T> = {
  data?: T;
  error?: string;
};

/** Minimal Next.js `next` config typing to avoid importing framework types. */
type NextFetchConfig = {
  revalidate?: number | false;
  tags?: string[];
};

/** RequestInit with Next.js extensions. */
export type ServerFetchInit = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
  next?: NextFetchConfig;
};

function isJsonResponse(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.toLowerCase().includes("application/json");
}

/**
 * fetchServerPageData
 * -------------------
 * Server-only helper for Server Components to fetch JSON from your own API routes.
 *
 * - Caller builds the URL (relative in prod/preview; absolute in dev).
 * - Returns `{ data, error }`. If the response is `{ data: ... }`, unwraps to `data`.
 * - Defaults: `Accept: application/json`, `redirect: "manual"`, and `cache: "no-store"`.
 *   If the caller supplies `cache` or `next.revalidate`, we do NOT force `no-store`.
 *
 * Example:
 *   const { data, error } = await fetchServerPageData<MyType>(url, {
 *     next: { revalidate: 60 }, // optional overrides
 *   });
 */
export async function fetchServerPageData<T = unknown>(url: string, init: ServerFetchInit = {}): Promise<ServerPageDataResult<T>> {
  try {
    const callerControlsCaching = init.cache !== undefined || init.next?.revalidate !== undefined;

    const defaultInit: ServerFetchInit = {
      redirect: "manual",
      headers: { Accept: "application/json" },
      ...(callerControlsCaching ? {} : { cache: "no-store" }),
    };

    // Merge headers so caller can override Accept or add more.
    const merged: ServerFetchInit = {
      ...defaultInit,
      ...init,
      headers: { ...(defaultInit.headers || {}), ...(init.headers || {}) },
    };

    const res = await fetch(url, merged as RequestInit);

    // Surface redirects (e.g., Vercel preview login page)
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location") || "(unknown)";
      return {
        error: `Unexpected redirect (${res.status}) to ${location}. Ensure same-origin in previews or pass auth headers/cookies.`,
      };
    }

    // Non-2xx -> try JSON, else treat as text/HTML
    if (!res.ok) {
      if (isJsonResponse(res)) {
        const errJson = (await res.json().catch(() => null)) as any;
        const msg = (errJson && (errJson.message || errJson.error)) || `Request failed with ${res.status}`;
        return { error: msg };
      } else {
        return { error: `Request failed with ${res.status}. Received non-JSON response.` };
      }
    }

    // 2xx but not JSON -> likely HTML (auth/404/error)
    if (!isJsonResponse(res)) {
      return { error: "Expected JSON but received non-JSON response." };
    }

    const json = (await res.json().catch(() => null)) as any;
    if (json == null) return { error: "Empty JSON response." };

    // Unwrap common `{ data: ... }` shape
    const payload = (Object.prototype.hasOwnProperty.call(json, "data") ? json.data : json) as T;
    return { data: payload };
  } catch (err) {
    console.error("[fetchServerPageData] Unexpected error:", err);
    return { error: "Unexpected server error. Please try again later." };
  }
}
