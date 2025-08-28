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

import LandingPageClient from "./LandingPageClient";

export default function Home() {
  return <LandingPageClient />;
}
