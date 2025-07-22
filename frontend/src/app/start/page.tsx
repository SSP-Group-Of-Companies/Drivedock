"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import LanguageSelector from "@/components/start/LanguageSelector";
import ConsentChecklist from "@/components/start/ConsentChecklist";
import ConsentCheckbox from "@/components/start/ConsentCheckbox";
import { useLanguageStore } from "@/hooks/useLanguageStore";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Footer from "@/components/Footer";
import WatermarkBackground from "@/components/WatermarkBackground";

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
  const [agreed, setAgreed] = useState(false);
  const { t, ready } = useTranslation("common", { useSuspense: false });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render when both translation and DOM are ready
  if (!ready || !mounted) return null;

  const canProceed = language && agreed;

  const handleContinue = () => {
    if (canProceed) {
      router.push("/start/company");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
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
        <div className="w-full max-w-lg bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-1">{t("start.beforeYouBegin")}</h2>
          <p className="text-sm text-gray-600 mb-4">
            {t("start.readAndAgree")}
          </p>
          <ConsentChecklist />
          <ConsentCheckbox agreed={agreed} setAgreed={setAgreed} />
          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!canProceed}
            className={`mt-6 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white text-sm font-semibold transition ${
              canProceed ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {t("start.continue")} <ArrowRight size={16} />
          </button>
          {/* Estimated time */}
          <p className="mt-2 text-center text-xs text-gray-500">
            {t("start.estimatedTime")}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
