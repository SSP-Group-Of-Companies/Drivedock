// src/hooks/onboarding/useProtectedRouter.ts
"use client";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { SessionManager } from "@/lib/onboarding/sessionManager";
import { ErrorManager } from "@/lib/onboarding/errorManager";

/**
 * Protected router hook that validates session before navigation
 * Only applies session checks on onboarding routes
 */
export function useProtectedRouter() {
  const router = useRouter();
  const pathname = usePathname();
  
  // Only apply protection on onboarding pages
  const isOnboardingPage = pathname.startsWith('/onboarding');

  const push = async (href: string, options?: any) => {
    // Skip session validation for non-onboarding pages or non-onboarding destinations
    if (!isOnboardingPage && !href.startsWith('/onboarding')) {
      router.push(href, options);
      return;
    }

    // Skip session validation for going home or to start pages
    if (href === '/' || href.startsWith('/start')) {
      router.push(href, options);
      return;
    }

    // Check session before navigation for onboarding routes
    if (isOnboardingPage || href.startsWith('/onboarding')) {
      // Extract tracker ID from current path
      const pathSegments = pathname.split('/');
      const trackerId = pathSegments[2]; // /onboarding/[id]/...
      
      if (trackerId && trackerId !== 'application-form' && trackerId !== 'prequalifications') {
        try {
          const response = await fetch(`/api/v1/onboarding/${trackerId}/session-check`);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorManager = ErrorManager.getInstance();
            
            // For navigation, session-related errors (401) should show session expired modal
            if (response.status === 401 || errorData.code === 'SESSION_REQUIRED') {
              errorManager.handleSessionExpired();
            } else {
              errorManager.handleApiError(errorData);
            }
            return;
          }

          // Update session activity on successful validation
          SessionManager.getInstance().updateActivity();
        } catch (error) {
          // Check if it's a real network error or session issue
          if (!navigator.onLine || (error instanceof TypeError && error.message.includes('fetch'))) {
            // Real network error
            const errorManager = ErrorManager.getInstance();
            errorManager.handleNetworkError();
          } else {
            // Likely session issue (cookie deleted, etc.)
            const errorManager = ErrorManager.getInstance();
            errorManager.handleSessionExpired();
          }
          return;
        }
      }
    }

    // Session is valid or navigation doesn't require session, proceed
    router.push(href, options);
  };

  const replace = async (href: string, options?: any) => {
    // Apply same session logic for replace as push
    if (isOnboardingPage || href.startsWith('/onboarding')) {
      if (!href.startsWith('/start') && href !== '/') {
        // Extract tracker ID from current path
        const pathSegments = pathname.split('/');
        const trackerId = pathSegments[2]; // /onboarding/[id]/...
        
        if (trackerId && trackerId !== 'application-form' && trackerId !== 'prequalifications') {
          try {
            const response = await fetch(`/api/v1/onboarding/${trackerId}/session-check`);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errorManager = ErrorManager.getInstance();
              
              // For navigation, session-related errors (401) should show session expired modal
              if (response.status === 401 || errorData.code === 'SESSION_REQUIRED') {
                errorManager.handleSessionExpired();
              } else {
                errorManager.handleApiError(errorData);
              }
              return;
            }

            // Update session activity on successful validation
            SessionManager.getInstance().updateActivity();
          } catch (error) {
            // Check if it's a real network error or session issue
            if (!navigator.onLine || (error instanceof TypeError && error.message.includes('fetch'))) {
              // Real network error
              const errorManager = ErrorManager.getInstance();
              errorManager.handleNetworkError();
            } else {
              // Likely session issue (cookie deleted, etc.)
              const errorManager = ErrorManager.getInstance();
              errorManager.handleSessionExpired();
            }
            return;
          }
        }
      }
    }

    router.replace(href, options);
  };

  const back = () => {
    // For back navigation, we'll let the middleware handle session validation
    // since it's harder to predict where back will go
    router.back();
  };

  const refresh = () => {
    router.refresh();
  };

  const forward = () => {
    router.forward();
  };

  return {
    push,
    replace,
    back,
    refresh,
    forward,
    // Expose original router for cases where protection isn't needed
    originalRouter: router,
  };
}
