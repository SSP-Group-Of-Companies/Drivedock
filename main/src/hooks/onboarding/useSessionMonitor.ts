// src/hooks/onboarding/useSessionMonitor.ts
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SessionManager } from "@/lib/onboarding/sessionManager";
import { SessionState } from "@/types/onboardingError.types";

/**
 * Simplified hook for session state tracking (no automatic monitoring)
 * Only tracks state, doesn't trigger automatic warnings
 */
export function useSessionMonitor() {
  const pathname = usePathname();
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  
  // Only monitor session on onboarding pages
  const isOnboardingPage = pathname.startsWith('/onboarding');

  useEffect(() => {
    if (!isOnboardingPage) {
      return;
    }

    const sessionManager = SessionManager.getInstance();

    // Set initial session state
    setSessionState(sessionManager.getSessionState());

    // Listen for session state changes (but don't auto-trigger modals)
    const unsubscribe = sessionManager.addListener((state: SessionState) => {
      setSessionState(state);
    });

    return unsubscribe;
  }, [isOnboardingPage]);

  return {
    sessionState,
    isSessionExpired: sessionState ? !sessionState.isActive : false,
    remainingTime: sessionState ? Math.max(0, sessionState.expiryTime - Date.now()) : 0,
  };
}
