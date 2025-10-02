// src/components/security/Turnstile.tsx
"use client";

import { NEXT_PUBLIC_TURNSTILE_SITE_KEY } from "@/config/env";
import { useEffect, useRef } from "react";

type Props = {
  siteKey?: string;
  /** "managed" | "invisible" | "non-interactive" — default "managed" */
  mode?: "managed" | "invisible" | "non-interactive";
  /** Called whenever a fresh token is produced */
  onToken?: (token: string) => void;
  /** Optional explicit lifecycle hooks (in addition to onToken("")) */
  onExpire?: () => void;
  onError?: () => void;
  onTimeout?: () => void;
  /** Optional: additional data- attributes (e.g., action, cdata) */
  options?: Record<string, string>;
  className?: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          "timeout-callback"?: () => void;
          size?: "invisible" | "normal" | "flexible";
          theme?: "auto" | "light" | "dark";
          appearance?: "always" | "execute";
          action?: string;
          cdata?: string;
        }
      ) => string; // widgetId
      reset: (id?: string) => void;
      remove: (id?: string) => void;
      execute: (id?: string) => void;
    };
  }
}

export default function Turnstile({ siteKey = NEXT_PUBLIC_TURNSTILE_SITE_KEY || "", mode = "managed", onToken, onExpire, onError, onTimeout, options, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const tryRender = () => {
      if (!window.turnstile) return;

      // Clean up prior render (hot reloads)
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      const size = mode === "invisible" ? "invisible" : mode === "non-interactive" ? "flexible" : "normal";

      widgetIdRef.current = window.turnstile.render(containerRef.current!, {
        sitekey: siteKey,
        size,
        callback: (token) => onToken?.(token),

        // Maintain existing behavior: also clear token via onToken("")
        "error-callback": () => {
          onError?.();
          onToken?.("");
        },
        "expired-callback": () => {
          onExpire?.();
          onToken?.("");
        },
        "timeout-callback": () => {
          onTimeout?.();
          onToken?.("");
        },

        ...(options || {}),
      });

      // For invisible mode, auto-execute once rendered
      if (mode === "invisible") {
        setTimeout(() => {
          if (widgetIdRef.current) window.turnstile?.execute(widgetIdRef.current);
        }, 0);
      }
    };

    // If script not ready yet, poll briefly
    if (!window.turnstile) {
      const id = setInterval(() => {
        if (window.turnstile) {
          clearInterval(id);
          tryRender();
        }
      }, 100);
      return () => clearInterval(id);
    }

    tryRender();
    return () => {
      if (widgetIdRef.current) {
        try {
          window.turnstile?.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, mode, JSON.stringify(options)]);

  return <div ref={containerRef} className={className} />;
}
