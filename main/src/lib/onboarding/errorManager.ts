// src/lib/onboarding/errorManager.ts
"use client";

import { OnboardingApiError, ErrorModalData, ErrorModalType } from "@/types/onboardingError.types";
import { EEApiErrorType } from "@/types/apiError.types";
import { ErrorMessageMapper } from "./errorMessages";
import { SessionManager } from "./sessionManager";

/**
 * Central error manager for handling all onboarding errors and displaying appropriate modals
 */
export class ErrorManager {
  private static instance: ErrorManager;
  private currentModal: ErrorModalData | null = null;
  private modalListeners: Set<(modal: ErrorModalData | null) => void> = new Set();
  private retryCallback: (() => void) | null = null;
  private messageMapper: ErrorMessageMapper | null = null;

  private constructor() {}

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  /**
   * Initialize with translation function
   */
  initialize(t: any): void {
    this.messageMapper = new ErrorMessageMapper(t);
  }

  /**
   * Handles structured API errors from backend
   */
  handleApiError(error: OnboardingApiError): void {
    if (!this.messageMapper) {
      console.error("ErrorManager not initialized with translation function");
      return;
    }

    const modalData = this.messageMapper.mapError(error.code, error.meta, error.message);
    this.showModal(modalData);
  }

  /**
   * Handles network connection errors
   */
  handleNetworkError(): void {
    if (!this.messageMapper) return;

    const modalData = this.messageMapper.createNetworkErrorModal();
    this.showModal(modalData);
  }

  /**
   * Handles session expiry
   */
  handleSessionExpired(): void {
    if (!this.messageMapper) return;

    // Mark session as inactive
    SessionManager.getInstance().markSessionInactive();

    const modalData = this.messageMapper.mapError(EEApiErrorType.SESSION_REQUIRED, {
      reason: "SESSION_NOT_FOUND_OR_REVOKED_OR_EXPIRED",
    });
    this.showModal(modalData);
  }

  /**
   * Handles unexpected errors
   */
  handleUnexpectedError(error: unknown): void {
    if (!this.messageMapper) return;

    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    const modalData = this.messageMapper.mapError(undefined, undefined, message);
    this.showModal(modalData);
  }

  /**
   * Sets retry callback for current operation
   */
  setRetryCallback(callback: () => void): void {
    this.retryCallback = callback;
  }

  /**
   * Clears retry callback
   */
  clearRetryCallback(): void {
    this.retryCallback = null;
  }

  /**
   * Shows error modal
   */
  showModal(modalData: ErrorModalData): void {
    // Only auto-override for error-like modals
    if (modalData.type !== ErrorModalType.CONFIRMATION) {
      const label = modalData.primaryAction.label.toLowerCase();
      if (label.includes("retry") || label.includes("close") || label.includes("try again")) {
        modalData.primaryAction.action = () => {
          this.hideModal();
          if (this.retryCallback) this.retryCallback();
        };
      }
    }
    this.currentModal = modalData;
    this.notifyModalListeners();
  }

  /**
   * Hides current modal
   */
  hideModal(): void {
    this.currentModal = null;
    this.clearRetryCallback();
    this.notifyModalListeners();
  }

  /**
   * Gets current modal data
   */
  getCurrentModal(): ErrorModalData | null {
    return this.currentModal;
  }

  /**
   * Adds listener for modal state changes
   */
  addModalListener(listener: (modal: ErrorModalData | null) => void): () => void {
    this.modalListeners.add(listener);
    return () => this.modalListeners.delete(listener);
  }

  /**
   * Notifies all modal listeners
   */
  private notifyModalListeners(): void {
    this.modalListeners.forEach((listener) => listener(this.currentModal));
  }

  showConfirm(params: { title: string; message: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel?: () => void; canClose?: boolean }): void {
    const modalData = {
      type: ErrorModalType.CONFIRMATION,
      title: params.title,
      message: params.message,
      primaryAction: {
        label: params.confirmLabel,
        action: () => {
          this.hideModal();
          params.onConfirm();
        },
      },
      secondaryAction: {
        label: params.cancelLabel,
        action: () => {
          this.hideModal();
          params.onCancel?.();
        },
      },
      canClose: params.canClose ?? true,
    } as ErrorModalData;

    // Directly set, do NOT run the auto-override branch used for errors.
    this.currentModal = modalData;
    this.notifyModalListeners();
  }
}

// Export singleton instance
export const errorManager = ErrorManager.getInstance();
