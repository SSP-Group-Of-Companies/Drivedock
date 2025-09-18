// src/lib/onboarding/apiClient.ts
"use client";

import { OnboardingApiResponse, OnboardingApiError } from "@/types/onboardingError.types";
import { SessionManager } from "./sessionManager";
import { ErrorManager } from "./errorManager";

/**
 * API client for onboarding requests with automatic error handling and session management
 */
export class OnboardingApiClient {
  private static instance: OnboardingApiClient;
  private sessionManager: SessionManager;
  private errorManager: ErrorManager;

  private constructor() {
    this.sessionManager = SessionManager.getInstance();
    this.errorManager = ErrorManager.getInstance();
  }

  static getInstance(): OnboardingApiClient {
    if (!OnboardingApiClient.instance) {
      OnboardingApiClient.instance = new OnboardingApiClient();
    }
    return OnboardingApiClient.instance;
  }

  /**
   * Enhanced fetch with automatic error handling and session management
   */
  async fetch<T = unknown>(
    url: string, 
    options: RequestInit = {}
  ): Promise<OnboardingApiResponse<T>> {
    try {
      // Check session before making request (for non-GET requests)
      if (options.method && options.method !== 'GET') {
        if (this.sessionManager.isSessionExpired()) {
          throw new Error('Session expired');
        }
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Handle successful responses
      if (response.ok) {
        const data = await response.json() as OnboardingApiResponse<T>;
        
        // Update session activity on successful API calls
        this.sessionManager.updateActivity();
        
        return data;
      }

      // Handle error responses
      const errorData = await response.json().catch(() => ({
        success: false,
        message: `Request failed with status ${response.status}`,
        code: response.status >= 500 ? 'INTERNAL' as any : undefined
      })) as OnboardingApiError;

      // For 5xx errors, treat as server errors regardless of the error code
      if (response.status >= 500) {
        const serverErrorData: OnboardingApiError = {
          ...errorData,
          code: 'INTERNAL' as any,
          message: errorData.message || 'Internal server error occurred'
        };
        this.errorManager.handleApiError(serverErrorData);
      } else {
        // Let ErrorManager handle the structured error normally
        this.errorManager.handleApiError(errorData);
      }

      // Return the error data for components that want to handle it themselves
      return errorData;

    } catch (error) {
      // Handle network errors (including offline, DNS failures, timeouts, CORS, etc.)
      if (error instanceof TypeError || 
          !navigator.onLine ||
          (error instanceof Error && (
            error.message.includes('fetch') || 
            error.message.includes('network') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            error.message.includes('ERR_NETWORK') ||
            error.message.includes('ERR_INTERNET_DISCONNECTED') ||
            error.message.includes('ERR_NAME_NOT_RESOLVED') ||
            error.message.includes('timeout') ||
            error.message.includes('CORS')
          ))) {
        this.errorManager.handleNetworkError();
        return {
          success: false,
          message: 'Network connection failed',
        } as OnboardingApiError;
      }

      // Handle session expiry
      if (error instanceof Error && error.message === 'Session expired') {
        this.errorManager.handleSessionExpired();
        return {
          success: false,
          message: 'Session expired',
        } as OnboardingApiError;
      }

      // Handle unexpected errors
      this.errorManager.handleUnexpectedError(error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      } as OnboardingApiError;
    }
  }

  /**
   * Convenience method for GET requests
   */
  async get<T = unknown>(url: string, options: Omit<RequestInit, 'method' | 'body'> = {}): Promise<OnboardingApiResponse<T>> {
    return this.fetch<T>(url, { ...options, method: 'GET' });
  }

  /**
   * Convenience method for POST requests
   */
  async post<T = unknown>(url: string, data?: unknown, options: Omit<RequestInit, 'method' | 'body'> = {}): Promise<OnboardingApiResponse<T>> {
    return this.fetch<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Convenience method for PATCH requests
   */
  async patch<T = unknown>(url: string, data?: unknown, options: Omit<RequestInit, 'method' | 'body'> = {}): Promise<OnboardingApiResponse<T>> {
    return this.fetch<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Convenience method for PUT requests
   */
  async put<T = unknown>(url: string, data?: unknown, options: Omit<RequestInit, 'method' | 'body'> = {}): Promise<OnboardingApiResponse<T>> {
    return this.fetch<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete<T = unknown>(url: string, options: Omit<RequestInit, 'method' | 'body'> = {}): Promise<OnboardingApiResponse<T>> {
    return this.fetch<T>(url, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = OnboardingApiClient.getInstance();
