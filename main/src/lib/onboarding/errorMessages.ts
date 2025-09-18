// src/lib/onboarding/errorMessages.ts
import { EEApiErrorType } from "@/types/apiError.types";
import { ErrorModalType, ErrorModalData } from "@/types/onboardingError.types";

/**
 * Maps backend error codes and reasons to user-friendly modal configurations
 */
export class ErrorMessageMapper {
  constructor(private t: any) {}

  /**
   * Maps structured backend error to modal configuration
   */
  mapError(code?: EEApiErrorType, meta?: Record<string, unknown>, message?: string): ErrorModalData {
    // Session-related errors
    if (code === EEApiErrorType.SESSION_REQUIRED) {
      const reason = meta?.reason as string;
      
      // Actual session timeout scenarios
      if (reason === "MISSING_OR_INVALID_COOKIE" || reason === "SESSION_NOT_FOUND_OR_REVOKED_OR_EXPIRED") {
        return this.createSessionExpiredModal();
      }
      
      // Application state issues (show as Not Found)
      if (reason === "TERMINATED" || reason === "ONBOARDING_EXPIRED" || reason === "TRACKER_NOT_FOUND" || reason === "COMPLETED") {
        return this.createNotFoundModal();
      }
      
      // Default to session expired for unknown SESSION_REQUIRED reasons
      return this.createSessionExpiredModal();
    }

    // Other error types
    switch (code) {
      case EEApiErrorType.NOT_FOUND:
        return this.createNotFoundModal();
      
      case EEApiErrorType.RATE_LIMITED:
        return this.createRateLimitedModal();
      
      case EEApiErrorType.INTERNAL:
        return this.createServerErrorModal();
      
      case EEApiErrorType.UNAUTHORIZED:
        return this.createGenericErrorModal(message || "You are not authorized to perform this action.");
      
      case EEApiErrorType.FORBIDDEN:
        return this.createGenericErrorModal(message || "Access to this resource is forbidden.");
      
      case EEApiErrorType.CONFLICT:
        return this.createGenericErrorModal(message || "There was a conflict with your request. Please try again.");
      
      case EEApiErrorType.VALIDATION_ERROR:
        // Validation errors should be handled by existing form validation
        // This is a fallback in case one slips through
        return this.createGenericErrorModal(message || "Please check your input and try again.");
      
      default:
        return this.createGenericErrorModal(message || "An unexpected error occurred.");
    }
  }

  /**
   * Creates network error modal for connection failures
   */
  createNetworkErrorModal(): ErrorModalData {
    return {
      type: ErrorModalType.NETWORK_ERROR,
      title: this.t("errors.network.title") || "Connection Failed",
      message: this.t("errors.network.message") || "Unable to connect to the server. Please check your internet connection and try again.",
      primaryAction: {
        label: this.t("errors.network.retry") || "Close",
        action: () => {
          // Close the modal so user can retry their action
          // This will be overridden by ErrorManager when showing the modal
        }
      },
      secondaryAction: {
        label: this.t("errors.network.goHome") || "Go Home",
        action: () => this.handleGoHome()
      },
      canClose: true
    };
  }

  /**
   * Creates session expired modal
   */
  private createSessionExpiredModal(): ErrorModalData {
    return {
      type: ErrorModalType.SESSION_EXPIRED,
      title: this.t("errors.session.title") || "Session Expired",
      message: this.t("errors.session.message") || "Your session has expired for security after 6 hours of inactivity. Your progress is safely saved.",
      primaryAction: {
        label: this.t("errors.session.resume") || "Resume Application",
        action: () => this.handleResumeApplication()
      },
      secondaryAction: {
        label: this.t("errors.session.goHome") || "Go Home",
        action: () => this.handleGoHome()
      },
      canClose: false
    };
  }

  /**
   * Creates not found modal (for terminated, expired, or missing applications)
   */
  private createNotFoundModal(): ErrorModalData {
    return {
      type: ErrorModalType.NOT_FOUND,
      title: this.t("errors.notFound.title") || "Application Not Found",
      message: this.t("errors.notFound.message") || "Your application could not be found. This may happen if the application was terminated or has expired.",
      primaryAction: {
        label: this.t("errors.notFound.startNew") || "Start New Application",
        action: () => this.handleStartNew()
      },
      secondaryAction: {
        label: this.t("errors.notFound.resume") || "Resume Existing",
        action: () => this.handleGoHome()
      },
      canClose: false
    };
  }

  /**
   * Creates rate limited modal
   */
  private createRateLimitedModal(): ErrorModalData {
    return {
      type: ErrorModalType.RATE_LIMITED,
      title: this.t("errors.rateLimit.title") || "Too Many Requests",
      message: this.t("errors.rateLimit.message") || "You've made too many requests. We'll automatically retry in 30 seconds, or you can go home and try again later.",
      primaryAction: {
        label: this.t("errors.rateLimit.wait") || "Auto-Retry in 30s",
        action: () => this.handleRateLimitRetry()
      },
      secondaryAction: {
        label: this.t("errors.rateLimit.goHome") || "Go Home",
        action: () => this.handleGoHome()
      },
      canClose: true
    };
  }

  /**
   * Creates server error modal
   */
  private createServerErrorModal(): ErrorModalData {
    return {
      type: ErrorModalType.SERVER_ERROR,
      title: this.t("errors.server.title") || "Server Error",
      message: this.t("errors.server.message") || "Something went wrong on our end. Please try again or contact support if the problem persists.",
      primaryAction: {
        label: this.t("errors.server.tryAgain") || "Try Again",
        action: () => {
          // Close modal so user can retry - will be overridden by ErrorManager
        }
      },
      secondaryAction: {
        label: this.t("errors.server.contactSupport") || "Contact Support",
        action: () => this.handleContactSupport()
      },
      canClose: true
    };
  }

  /**
   * Creates generic error modal
   */
  private createGenericErrorModal(message: string): ErrorModalData {
    return {
      type: ErrorModalType.GENERIC_ERROR,
      title: this.t("errors.generic.title") || "Unexpected Error",
      message: `${message}\n\nIf this problem persists, please contact our support team for assistance.`,
      primaryAction: {
        label: this.t("errors.generic.contactSupport") || "Contact Support",
        action: () => this.handleContactSupport()
      },
      secondaryAction: {
        label: this.t("errors.generic.goHome") || "Go Home",
        action: () => this.handleGoHome()
      },
      canClose: true
    };
  }

  // Action handlers - these will be implemented by the error manager
  private handleRetry() {
    // Will be overridden by ErrorManager
  }

  private handleResumeApplication() {
    window.location.href = "/";
  }

  private handleGoHome() {
    window.location.href = "/";
  }

  private handleStartNew() {
    window.location.href = "/";
  }

  private handleContactSupport() {
    // Open support email
    window.open("mailto:safety@sspgroup.com", "_blank");
  }

  private handleRateLimitRetry() {
    // Close modal and wait 30 seconds then retry
    // User will see a brief message that retry will happen automatically
    setTimeout(() => {
      this.handleRetry();
    }, 30000);
  }
}
