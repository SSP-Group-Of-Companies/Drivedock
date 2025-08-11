/**
 * ======================================================================
 * File: hooks/frontendHooks/useCompanySelection.ts
 * Project: DriveDock (SSP Truck Line) – Driver Onboarding
 * ----------------------------------------------------------------------
 * Purpose:
 *   Centralized store for the currently selected company in the onboarding
 *   flow. This selection is reused across prequalification and subsequent
 *   steps (e.g., for country-specific logic, application type, branding).
 *
 * Why Zustand + Persist?
 *   - Zustand keeps the API tiny and ergonomic for React components.
 *   - The persist middleware stores the selection in localStorage so the
 *     choice survives tab refreshes (very common for drivers).
 *
 * Contract / Data Model:
 *   - `CompanyData` extends the static `Company` definition and optionally
 *     includes an `ECompanyApplicationType` (e.g., "Flatbed", "Dry Van").
 *   - `selectedCompany` is `null` until a user picks a company on entry.
 *
 * SSR Note:
 *   - This hook is client-side only (uses localStorage via persist).
 *   - Do not import this file in Next.js server components or API routes.
 *
 * Usage:
 *   const { selectedCompany, setSelectedCompany, clearSelectedCompany } =
 *     useCompanySelection();
 *
 *   setSelectedCompany({ ...company, type: ECompanyApplicationType.FLATBED });
 *   // ...later
 *   clearSelectedCompany();
 *
 * Persistence:
 *   - Stored under localStorage key: "drivedock-selected-company"
 *   - IMPORTANT: On successful POST of page-1 (creating tracker), this
 *     store is typically left intact (it represents the company context),
 *     whereas prequalification answers are cleared.
 *
 * Single Source of Truth:
 *   - `ECompanyApplicationType` is declared here. If you need to share this
 *     enum with server code, move it to a shared non-React module (e.g.,
 *     "@/types/company.types") and import it here, rather than the other way.
 * ======================================================================
 */

import { create } from "zustand";
import type { Company } from "@/constants/companies";
import { persist } from "zustand/middleware";

/**
 * Enum for company-specific application types,
 * e.g., Flatbed or Dry Van.
 * This is the single source of truth for these values.
 */
export enum ECompanyApplicationType {
  FLATBED = "FLAT_BED",
  DRY_VAN = "DRY_VAN",
}

/**
 * Extends the base Company type with optional application type.
 * - `type` is used when a company has multiple application tracks
 *   (e.g., SSP-CA with Flatbed vs Dry Van).
 */
export type CompanyData = Company & {
  type?: ECompanyApplicationType | string;
};

/**
 * Shape of the Zustand store for company selection.
 * - `selectedCompany`: the active company context or null if not chosen.
 * - `setSelectedCompany`: assigns/overwrites the current selection.
 * - `clearSelectedCompany`: resets the selection back to null.
 */
interface CompanyStore {
  selectedCompany: CompanyData | null;
  setSelectedCompany: (company: CompanyData) => void;
  clearSelectedCompany: () => void;
}

/**
 * Global company selection store.
 * - `persist` ensures the selected company survives page reloads.
 * - Storage key: "drivedock-selected-company"
 */
export const useCompanySelection = create<CompanyStore>()(
  persist(
    (set) => ({
      // Initially no company is selected until the user chooses one.
      selectedCompany: null,

      // Set/overwrite the selected company (typically from the company picker).
      setSelectedCompany: (company) => set({ selectedCompany: company }),

      // Clear the selection (useful when resetting the onboarding flow).
      clearSelectedCompany: () => set({ selectedCompany: null }),
    }),
    {
      // localStorage key used by the persist middleware.
      name: "drivedock-selected-company", // LocalStorage key
    }
  )
);
