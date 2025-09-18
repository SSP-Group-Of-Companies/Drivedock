// src/lib/onboarding/sessionManager.ts
import { SessionState } from "@/types/onboardingError.types";

/**
 * Manages session state and activity tracking for onboarding flow
 */
export class SessionManager {
  private static instance: SessionManager;
  private sessionState: SessionState;
  private listeners: Set<(state: SessionState) => void> = new Set();

  // Session configuration
  private readonly SESSION_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

  private constructor() {
    this.sessionState = {
      lastActivity: Date.now(),
      isActive: true,
      warningShown: false,
      expiryTime: Date.now() + this.SESSION_DURATION_MS
    };
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Updates session activity timestamp (called on successful API calls)
   */
  updateActivity(): void {
    const now = Date.now();
    this.sessionState = {
      ...this.sessionState,
      lastActivity: now,
      expiryTime: now + this.SESSION_DURATION_MS,
      warningShown: false,
      isActive: true
    };

    this.notifyListeners();
  }

  /**
   * Gets current session state
   */
  getSessionState(): SessionState {
    return { ...this.sessionState };
  }

  /**
   * Checks if session is expired based on last activity
   */
  isSessionExpired(): boolean {
    return Date.now() > this.sessionState.expiryTime;
  }

  /**
   * Gets remaining session time in milliseconds
   */
  getRemainingTime(): number {
    return Math.max(0, this.sessionState.expiryTime - Date.now());
  }

  /**
   * Marks session as inactive (expired)
   */
  markSessionInactive(): void {
    this.sessionState.isActive = false;
    this.notifyListeners();
  }

  /**
   * Adds listener for session state changes
   */
  addListener(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifies all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getSessionState()));
  }
}
