/**
 * Landing Page Client Component — DriveDock
 *
 * Description:
 * Client-side wrapper for the landing page that handles localStorage clearing
 * to ensure each user starts with a clean slate, preventing cross-user contamination.
 *
 * Key Features:
 * - Clears any previous company selection from localStorage on mount
 * - Renders the landing page content
 * - Ensures fresh start for each user session
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-01-27
 */

"use client";

import { useEffect } from "react";
import { useCompanySelection } from "@/hooks/frontendHooks/useCompanySelection";
import { usePrequalificationStore } from "@/store/usePrequalificationStore";
import Navbar from "@/components/shared/Navbar";
import WelcomeSection from "@/app/start/components/WelcomeSection";
import FeatureCards from "@/app/start/components/FeatureCards";
import ProcessSteps from "@/app/start/components/ProcessSteps";
import Footer from "@/components/shared/Footer";
import WatermarkBackground from "@/components/shared/WatermarkBackground";

export default function LandingPageClient() {
  const { clearSelectedCompany } = useCompanySelection();
  const { clearData } = usePrequalificationStore();

  // Clear any previous user's data on landing page mount
  useEffect(() => {
    // Clear company selection to prevent cross-user contamination
    clearSelectedCompany();
    
    // Clear prequalification data to ensure fresh start
    clearData();
    
    // Note: We don't clear onboarding tracker here as it's used for resumed applications
    // and should persist across sessions for legitimate users
  }, [clearSelectedCompany, clearData]);

  return (
    <>
      {/* Top navigation bar with company logo and language options */}
      <Navbar />

      {/* Main content area: vertically structured, full viewport height */}
      <main className="min-h-screen sm:min-h-[100vh] flex flex-col items-center justify-between overflow-hidden">
        {/* Company watermark (non-intrusive background branding) */}
        <WatermarkBackground />

        {/* Hero welcome section */}
        <WelcomeSection />

        {/* Key feature highlights */}
        <FeatureCards />

        {/* Process steps are hidden on mobile for cleaner layout */}
        <div className="hidden md:block w-full">
          <ProcessSteps />
        </div>
      </main>

      {/* Footer with contact details and legal info */}
      <Footer />
    </>
  );
}
