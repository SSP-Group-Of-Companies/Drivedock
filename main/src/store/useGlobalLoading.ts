/**
 * Global Loading State Management — DriveDock (SSP Portal)
 *
 * Description:
 * Zustand store for managing global loading state across the application.
 * Provides a centralized way to show/hide loading screens with minimum
 * display time to prevent jarring flashes during fast operations.
 *
 * Features:
 * - Minimum display time (100ms) to prevent loading screen flashes
 * - Automatic timeout management for smooth UX
 * - Centralized loading state for consistent user experience
 *
 * Usage:
 * const { show, hide } = useGlobalLoading();
 * show("Loading..."); // Shows loader with message
 * hide(); // Hides loader (respects minimum display time)
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
  // Internal state for managing minimum display time
  let hideTimeout: NodeJS.Timeout | null = null;
  let showTime: number | null = null;
  const MIN_DISPLAY_TIME = 100; // Minimum display time to prevent flash

  return {
    visible: false,
    message: undefined,

    /**
     * Shows the global loading screen with optional message
     * @param message - Optional loading message to display
     */
    show: (message) => {
      // Clear any pending hide timeout to prevent conflicts
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }

      // Record when we started showing the loader
      showTime = Date.now();
      set({ visible: true, message });
    },

    /**
     * Hides the global loading screen with minimum display time enforcement
     * Prevents jarring flashes by ensuring loader shows for at least MIN_DISPLAY_TIME
     */
    hide: () => {
      const currentTime = Date.now();
      const timeShown = showTime ? currentTime - showTime : 0;

      // If we haven't shown the loader for minimum time, schedule the hide
      if (timeShown < MIN_DISPLAY_TIME) {
        const remainingTime = MIN_DISPLAY_TIME - timeShown;
        hideTimeout = setTimeout(() => {
          set({ visible: false, message: undefined });
          hideTimeout = null;
          showTime = null;
        }, remainingTime);
      } else {
        // We've shown it long enough, hide immediately
        set({ visible: false, message: undefined });
        showTime = null;
      }
    },
  };
});
