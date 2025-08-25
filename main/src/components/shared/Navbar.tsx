/**
 * Navbar Component — DriveDock
 *
 * Description:
 * The main navigation bar for the onboarding flow and public pages.
 * Displays the company logo (link to home), optional language selection dropdown,
 * and an optional back button depending on the current route.
 *
 * Key Components & Hooks:
 * - `useMounted`: Prevents hydration mismatch by delaying render until client mount.
 * - `LanguageDropdown`: Allows the user to switch between supported languages.
 * - `onboardingStepFlow`: Ordered array of step route segments for step navigation logic.
 * - `next/navigation` hooks: `useRouter`, `usePathname`, `useParams` for routing control.
 * - `framer-motion`: Animates the back arrow icon on hover.
 *
 * Functionality:
 * - Logo always links back to `/` (landing page).
 * - Back button:
 *   - If in the onboarding flow and not on the first step, navigates to the previous step.
 *   - If on the first onboarding step, goes back to `/start`.
 *   - Else falls back to browser history `router.back()`.
 * - Language dropdown:
 *   - Shown on all pages except `/` and `/start`.
 * - Back button is hidden on the landing page (`/`).
 *
 * Routing:
 * - Global navbar, present across onboarding and start pages.
 * - Navigation logic is aware of tracker IDs for proper step-by-step navigation.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useRouter, usePathname, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

// Components, hooks & constants
import useMounted from "@/hooks/useMounted";
import LanguageDropdown from "@/components/shared/LanguageDropdown";

import { handleBackNavigation } from "@/lib/utils/onboardingUtils";
import ProfileDropdown from "./ProfileDropdown";

export default function Navbar() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  /**
   * Handles back button click using shared navigation logic
   */
  const handleBackClick = () => {
    const trackerId = (params?.id as string) || undefined;
    handleBackNavigation(pathname, trackerId, router, { needsFlatbedTraining: false });
  };

  // UI control flags
  const showBack = pathname !== "/";
  const showLanguageDropdown = pathname !== "/" && pathname !== "/start";

  // Avoid rendering until mounted to prevent hydration mismatch
  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-md shadow-sm supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
        {/* Logo linking to landing page */}
        <div className="flex items-center">
          <Link href="/" aria-label="navbar image">
            {mounted && (
              <Image
                src="/assets/logos/SSP-Truck-LineFullLogo.png"
                alt="navbar image"
                width={0}
                height={0}
                sizes="100vw"
                className="w-[90px] sm:w-[110px] md:w-[130px] h-auto object-contain"
                priority
              />
            )}
          </Link>
        </div>

        {/* Right section: Language dropdown and back button */}
        <div className="flex items-center gap-2 ml-auto">
          {showLanguageDropdown && <LanguageDropdown />}

          {showBack && (
            <button
              onClick={handleBackClick}
              className="ml-2 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white font-medium shadow hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-blue-300"
              aria-label="Go Back"
            >
              {/* Back arrow with hover animation */}
              <motion.span initial={{ x: 0 }} whileHover={{ x: -8 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <ArrowLeft size={18} />
              </motion.span>
              <span className="hidden sm:inline">{t("navbar.backButton")}</span>
            </button>
          )}
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}
