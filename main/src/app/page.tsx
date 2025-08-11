/**
 * Public Home Page — DriveDock
 *
 * Description:
 * This is the landing entry point for the driver onboarding process.
 * It serves as the first public-facing page that introduces applicants
 * to the SSP Group of Companies' hiring process and system features.
 *
 * Key Components:
 * - Navbar: Persistent navigation header for branding and navigation.
 * - WatermarkBackground: Semi-transparent background branding.
 * - WelcomeSection: Hero section introducing the company and onboarding.
 * - FeatureCards: Highlights key benefits and features of DriveDock.
 * - ProcessSteps: Step-by-step visual guide to the onboarding process.
 * - Footer: Company contact and legal information.
 *
 * Routing:
 * This page is mounted at the root `/` route and is publicly accessible.
 * No authentication or backend calls are triggered here.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

import Navbar from "@/components/shared/Navbar";
import WelcomeSection from "@/app/start/components/WelcomeSection";
import FeatureCards from "@/app/start/components/FeatureCards";
import ProcessSteps from "@/app/start/components/ProcessSteps";
import Footer from "@/components/shared/Footer";
import WatermarkBackground from "@/components/shared/WatermarkBackground";

export default function Home() {
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
