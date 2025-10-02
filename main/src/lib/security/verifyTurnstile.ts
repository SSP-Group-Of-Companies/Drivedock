import { TURNSTILE_SECRET_KEY } from "@/config/env";

// src/lib/security/verifyTurnstile.ts
export type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
  // extra fields: challenge_ts, hostname, action, cdata
};

export async function verifyTurnstileToken(token: string) {
  const secret = TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: false, error: "Missing TURNSTILE_SECRET_KEY" } as const;
  }
  if (!token) {
    return { ok: false, error: "Missing Turnstile token" } as const;
  }

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret,
      response: token,
    }),
    // Important: always do this server-side. Never expose secret client-side.
  });

  const data = (await res.json()) as TurnstileVerifyResponse;
  if (!data.success) {
    return { ok: false, error: (data["error-codes"] || []).join(", ") || "Verification failed" } as const;
  }
  return { ok: true, data } as const;
}
