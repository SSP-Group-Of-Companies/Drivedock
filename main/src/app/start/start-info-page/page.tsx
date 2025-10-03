/**
 * Start Page — DriveDock
 *
 * Description:
 * This is the first step in the driver onboarding process after the landing page.
 * It asks the user to:
 * - Select their preferred language for the application process.
 * - Read and agree to the onboarding terms and checklist.
 *
 * Features:
 * - Language selection (with animated highlight ring on first mount).
 * - Consent checklist for important notices before starting.
 * - Terms modal shown before allowing agreement.
 * - Continue button enabled only when a language is selected AND terms are agreed.
 *
 * Routing:
 * - Accessible at `/start`.
 * - On successful consent and language selection, routes to `/start/company`.
 *
 * Components Used:
 * - Navbar (shared) — Top navigation bar.
 * - WatermarkBackground — Faded background logo.
 * - LanguageSelector — Interactive dropdown for selecting application language.
 * - ConsentChecklist — List of requirements before starting.
 * - ConsentCheckbox — Checkbox triggering Terms modal.
 * - Footer (shared) — Application footer.
 *
 * State Management:
 * - Language is stored in Zustand via `useLanguageStore`.
 * - Agreement state is local to the page via `useState`.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import LanguageSelector from "@/app/start/components/LanguageSelector";
import ConsentChecklist from "@/app/start/components/ConsentChecklist";
import ConsentCheckbox from "@/app/start/components/ConsentCheckbox";
import { useLanguageStore } from "@/hooks/useLanguageStore";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Footer from "@/components/shared/Footer";
import { useCountrySelection } from "@/hooks/useCountrySelection";
import WatermarkBackground from "@/components/shared/WatermarkBackground";

export default function StartPage() {
  return (
    <Suspense fallback={null}>
      <StartPageContent />
    </Suspense>
  );
}

function StartPageContent() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { selectedCountryCode } = useCountrySelection();
  const [agreed, setAgreed] = useState(false);
  const { t } = useTranslation("common", { useSuspense: false });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Continue button only enabled when language, consent, and country selected
  const canProceed = Boolean(language && agreed && selectedCountryCode);

  const handleContinue = () => {
    if (canProceed) {
      router.push("/onboarding/prequalifications");
    }
  };

  // Only render when both translation and DOM are ready
  if (!mounted) return null;
  return (
    <div className="flex flex-col min-h-screen">
      {/* Top navigation */}
      <Navbar />

      {/* Main onboarding content */}
      <main className="relative flex-1 flex flex-col items-center justify-start px-4 py-10 bg-blue-50 text-gray-800">
        <WatermarkBackground />

        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">{t("start.heading")}</h1>
          <p className="text-sm text-gray-600">{t("start.subheading")}</p>
        </div>

        {/* Language Selector */}
        <div className="w-full max-w-lg mb-6 relative">
          <label className="block text-sm font-semibold mb-2">
            {t("start.languageLabel")}
          </label>
          <LanguageSelector />
        </div>

        {/* Consent Card */}
        <div className="w-full max-w-2xl bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-1">
            {t("start.beforeYouBegin")}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {t(
              "start.ensureDocWithCountryHint",
              "Please ensure you have the documents listed below to complete this application process. Click one of the cards below to select your region (Canada or USA). The Continue button will unlock after you select a country and agree to the terms."
            )}
          </p>

          {/* Checklist of conditions */}
          <ConsentChecklist />

          {/* Terms checkbox & modal */}
          <ConsentCheckbox agreed={agreed} setAgreed={setAgreed} />

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!canProceed}
            className={`mt-6 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white text-sm cursor-pointer font-semibold transition ${
              canProceed
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {t("start.continue")} <ArrowRight size={16} />
          </button>

          {/* Estimated completion time */}
          <p className="mt-2 text-center text-xs text-gray-500">
            {t("start.estimatedTime")}
          </p>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
