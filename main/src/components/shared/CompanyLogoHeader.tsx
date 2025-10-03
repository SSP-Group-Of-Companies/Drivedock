/**
 * Company Logo Header Component — DriveDock
 *
 * Description:
 * Displays the selected company's logo (and optionally its name) at the top of a page or form.
 * Used for branding consistency across onboarding steps after a company is chosen.
 *
 * Props:
 * - `logoOnly` (boolean, optional): When `true`, only the company logo is shown (default is `false`).
 *
 * Key Components & Hooks:
 * - `useCompanySelection`: Custom hook for retrieving the currently selected company from state.
 * - `next/image`: Optimized image rendering for company logos.
 *
 * Functionality:
 * - If no company is selected, renders nothing (`null`).
 * - Displays the company's logo with responsive sizing.
 * - Optionally displays the company name below the logo if `logoOnly` is `false`.
 *
 * Styling:
 * - Logo centered horizontally and vertically.
 * - Company name styled as a small, muted text label.
 *
 * Routing:
 * - Commonly used in onboarding steps after the company selection page.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

// Company logo should only show when tracker context provides companyId
import Image from "next/image";
import { COMPANIES } from "@/constants/companies";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

type Props = {
  logoOnly?: boolean;
  onboardingContext?: IOnboardingTrackerContext | null;
};

export default function CompanyLogoHeader({ logoOnly = false, onboardingContext }: Props) {
  // Only use company from context; no fallback to client-side selection
  const company = onboardingContext?.companyId ? COMPANIES.find(c => c.id === onboardingContext.companyId) : undefined;

  // If no company is available, render nothing
  if (!company) return null;

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center">
        {/* Company logo */}
        <Image
          src={company.logo}
          alt={company.name}
          width={160}
          height={60}
          priority
          className="object-contain w-auto h-12 sm:h-16"
        />
        {/* Company name (optional) */}
        {!logoOnly && (
          <p className="text-sm text-gray-600 mt-1">{company.name}</p>
        )}
      </div>
    </div>
  );
}
