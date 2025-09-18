// src/hooks/onboarding/useErrorModal.ts
"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorManager } from "@/lib/onboarding/errorManager";
import { ErrorModalData } from "@/types/onboardingError.types";
import { EEApiErrorType } from "@/types/apiError.types";

/**
 * Hook for managing error modal state
 */
export function useErrorModal() {
  const { t } = useTranslation("common");
  const [currentModal, setCurrentModal] = useState<ErrorModalData | null>(null);

  useEffect(() => {
    const errorManager = ErrorManager.getInstance();
    
    // Initialize error manager with translation function
    errorManager.initialize(t);

    // Set initial modal state
    setCurrentModal(errorManager.getCurrentModal());

    // Listen for modal changes
    const unsubscribe = errorManager.addModalListener((modal: ErrorModalData | null) => {
      setCurrentModal(modal);
    });

    // Listen for test events
    const handleTestSessionExpired = () => {
      // Trigger session expired modal specifically
      errorManager.handleApiError({
        success: false,
        message: 'Session expired for testing',
        code: EEApiErrorType.SESSION_REQUIRED,
        meta: { reason: 'SESSION_NOT_FOUND_OR_REVOKED_OR_EXPIRED' }
      });
    };

    const handleTestNetworkError = () => {
      errorManager.handleNetworkError();
    };

    const handleTestNotFound = () => {
      errorManager.handleApiError({
        success: false,
        message: 'Application not found',
        code: EEApiErrorType.NOT_FOUND
      });
    };

    const handleTestGenericError = () => {
      errorManager.handleUnexpectedError(new Error('This is a test generic error to demonstrate the fallback error handling system.'));
    };

    window.addEventListener('onboarding-test-session-expired', handleTestSessionExpired);
    window.addEventListener('onboarding-test-network-error', handleTestNetworkError);
    window.addEventListener('onboarding-test-not-found', handleTestNotFound);
    window.addEventListener('onboarding-test-generic-error', handleTestGenericError);

    return () => {
      unsubscribe();
      window.removeEventListener('onboarding-test-session-expired', handleTestSessionExpired);
      window.removeEventListener('onboarding-test-network-error', handleTestNetworkError);
      window.removeEventListener('onboarding-test-not-found', handleTestNotFound);
      window.removeEventListener('onboarding-test-generic-error', handleTestGenericError);
    };
  }, [t]);

  const hideModal = () => {
    ErrorManager.getInstance().hideModal();
  };

  const showModal = (modalData: ErrorModalData) => {
    ErrorManager.getInstance().showModal(modalData);
  };

  return {
    currentModal,
    hideModal,
    showModal,
  };
}
