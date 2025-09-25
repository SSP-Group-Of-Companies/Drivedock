// src/types/onboardingError.types.ts
import { EEApiErrorType } from "./apiError.types";

/**
 * Structured error response from backend APIs
 */
export interface OnboardingApiError {
  success: false;
  message: string;
  code?: EEApiErrorType;
  meta?: {
    reason?: string;
    clearCookieHeader?: string;
    [key: string]: unknown;
  };
  errors?: Record<string, string>;
}

/**
 * Success response from backend APIs
 */
export interface OnboardingApiSuccess<T = unknown> {
  success: true;
  message: string;
  data: T;
}

/**
 * Union type for all API responses
 */
export type OnboardingApiResponse<T = unknown> = OnboardingApiSuccess<T> | OnboardingApiError;

/**
 * Error modal types for different scenarios
 */
export enum ErrorModalType {
  SESSION_EXPIRED = "SESSION_EXPIRED",
  NOT_FOUND = "NOT_FOUND", 
  NETWORK_ERROR = "NETWORK_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  RATE_LIMITED = "RATE_LIMITED",
  GENERIC_ERROR = "GENERIC_ERROR"
}

/**
 * Error modal data structure
 */
export interface ErrorModalData {
  type: ErrorModalType;
  title: string;
  message: string;
  primaryAction: {
    label: string;
    action: () => void;
  };
  secondaryAction?: {
    label: string;
    action: () => void;
  };
  canClose?: boolean;
}

/**
 * Session state for tracking activity and expiry
 */
export interface SessionState {
  lastActivity: number;
  isActive: boolean;
  warningShown: boolean; // Keep for compatibility but not used
  expiryTime: number;
}
