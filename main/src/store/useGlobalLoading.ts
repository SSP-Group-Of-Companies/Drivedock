/**
 * Global Loading State Management — DriveDock (SSP Portal)
 *
 * Description:
 * Simple Zustand store for managing global loading state across the application.
 * Provides immediate show/hide functionality without any minimum display time.
 *
 * Features:
 * - Immediate show/hide without delays
 * - Simple state management
 * - Centralized loading state
 *
 * Usage:
 * const { show, hide } = useGlobalLoading();
 * show("Loading..."); // Shows loader immediately
 * hide(); // Hides loader immediately
 *
 * Author: Faruq Adebayo Atanda
 * Company: SSP Group of Companies
 * Created: 2025-01-27
 */

import { create } from "zustand";

type GlobalLoadingState = {
  visible: boolean;
  message?: string;
  show: (msg?: string) => void;
  hide: () => void;
};

export const useGlobalLoading = create<GlobalLoadingState>((set) => {
  return {
    visible: false,
    message: undefined,

    /**
     * Shows the global loading screen with optional message
     * @param message - Optional loading message to display
     */
    show: (message) => {
      set({ visible: true, message });
    },

    /**
     * Hides the global loading screen immediately
     */
    hide: () => {
      set({ visible: false, message: undefined });
    },
  };
});
