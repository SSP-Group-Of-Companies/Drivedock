/**
 * Dashboard Loading State Management — DriveDock (SSP Portal)
 *
 * Description:
 * Zustand store for managing dashboard-specific loading state.
 * Separate from the global loading store to avoid conflicts with the onboarding side.
 *
 * Features:
 * - Dashboard-specific loading state
 * - Theme-aware loading management
 * - Immediate show/hide functionality
 *
 * Usage:
 * const { show, hide } = useDashboardLoading();
 * show("Loading..."); // Shows dashboard loader immediately
 * hide(); // Hides dashboard loader immediately
 *
 * Author: Faruq Adebayo Atanda
 * Company: SSP Group of Companies
 * Created: 2025-01-27
 */

import { create } from "zustand";

type DashboardLoadingState = {
  visible: boolean;
  message?: string;
  isVisible: boolean;
  show: (msg?: string) => void;
  hide: () => void;
};

export const useDashboardLoading = create<DashboardLoadingState>((set, get) => {
  return {
    visible: false,
    message: undefined,
    get isVisible() {
      return get().visible;
    },

    /**
     * Shows the dashboard loading screen with optional message
     * @param message - Optional loading message to display
     */
    show: (message) => {
      set({ visible: true, message });
    },

    /**
     * Hides the dashboard loading screen immediately
     */
    hide: () => {
      set({ visible: false, message: undefined });
    },
  };
});
