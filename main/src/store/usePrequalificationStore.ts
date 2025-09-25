/**
 * =============================================================================
 * DriveDock – Prequalification Store (Zustand + Persist)
 * -----------------------------------------------------------------------------
 * Role
 *   Local, persistent storage for Step 1 (Pre-Qualification) answers.
 *
 * Why this exists
 *   • Step 1 does not hit the backend — we only collect answers and move on.
 *   • Persisting to localStorage lets a driver refresh/close the tab without losing data.
 *   • After the Step 2 POST (which sends Page 1 + these prequal answers), we clear the store
 *     so a new driver on the same device doesn’t inherit old data.
 *
 * Guarantees / Contracts
 *   • The data shape is the shared backend type: `IPreQualifications`.
 *   • The storage key is stable: "drivedock-prequalifications".
 *   • `setData` overwrites the entire object; `clearData` resets to null.
 *
 * Usage
 *   import { usePrequalificationStore } from "@/store/usePrequalificationStore";
 *   const { data, setData, clearData } = usePrequalificationStore();
 *
 *   - On Step 1 submit: convert form values → IPreQualifications and call setData(payload)
 *   - On successful Step 2 POST: call clearData()
 *
 * Owner: SSP Tech Team – DriveDock
 * =============================================================================
 */

import { create } from "zustand"; // Zustand state creator
import { persist } from "zustand/middleware"; // Persistence middleware (localStorage)
import { IPreQualifications } from "@/types/preQualifications.types"; // Shared BE/FE type

/**
 * Shape of the Zustand store for prequalification answers.
 */
interface PrequalificationStore {
  data: IPreQualifications | null; // Entire Step 1 payload or null when empty
  setData: (data: IPreQualifications) => void; // Overwrite store with a full, validated object
  clearData: () => void; // Reset to null (called after Step 2 POST)
}

/**
 * The exported hook used across the app to access/update prequalification answers.
 * - Wrapped in `persist` so the data survives page reloads.
 * - Stored under the localStorage key: "drivedock-prequalifications".
 */
export const usePrequalificationStore = create<PrequalificationStore>()(
  persist(
    (set) => ({
      data: null, // Initial state: nothing captured yet
      setData: (data) => set({ data }), // Replace entire object — single source of truth
      clearData: () => set({ data: null }), // Wipe after POST or when starting fresh
    }),
    {
      name: "drivedock-prequalifications", // ✅ Stable localStorage key
      // Note: default storage is localStorage in the browser environment.
      // If SSR customization is needed, provide the `storage` option here.
    }
  )
);
