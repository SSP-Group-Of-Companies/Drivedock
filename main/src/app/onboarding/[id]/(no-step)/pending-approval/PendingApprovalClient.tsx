"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { CheckCircle2, Hourglass } from "lucide-react";

import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { buildOnboardingStepPath } from "@/lib/utils/onboardingUtils";
import useMounted from "@/hooks/useMounted";
import { Confetti } from "@/components/shared";

export type PendingApprovalClientProps = {
  onboardingContext: IOnboardingTrackerContext;
};

export default function PendingApprovalClient({ onboardingContext }: PendingApprovalClientProps) {
  const mounted = useMounted();
  const router = useRouter();
  const { t } = useTranslation("common");

  const [ctx] = useState<IOnboardingTrackerContext>(onboardingContext);
  const approved = Boolean(ctx.invitationApproved);

  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (approved) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [approved]);

  const handleResume = useCallback(() => {
    router.push(buildOnboardingStepPath(ctx));
  }, [ctx, router]);

  const headerBlock = useMemo(() => {
    if (approved) {
      return (
        <div className="rounded-xl bg-green-50 ring-1 ring-green-100 p-4 flex items-center gap-2 justify-center">
          <CheckCircle2 className="text-green-600 w-5 h-5" />
          <p className="text-sm text-green-800 font-medium">{t("pendingApprovalPage.approved.title")}</p>
        </div>
      );
    }
    return (
      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4 flex items-center gap-2 justify-center">
        <Hourglass className="text-amber-600 w-5 h-5" />
        <p className="text-sm text-gray-800 font-medium">{t("pendingApprovalPage.pending.title")}</p>
      </div>
    );
  }, [approved, t]);

  if (!mounted) return null;

  if (approved) {
    return (
      <>
        {showConfetti && <Confetti />}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center space-y-6">
          {/* Header Badge */}
          {headerBlock}

          {/* Success Message Card */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 max-w-2xl mx-auto">
            <h2 className="text-lg font-bold text-gray-800 pb-2">{t("pendingApprovalPage.approved.subtitle")}</h2>
            <p className="text-sm text-green-800 max-w-2xl mx-auto">{t("pendingApprovalPage.approved.body1")}</p>
            <p className="text-sm text-green-800 max-w-2xl mx-auto mt-2">{t("pendingApprovalPage.approved.body2")}</p>
          </div>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={handleResume}
              className="px-8 py-2.5 bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white font-semibold rounded-full shadow-lg hover:opacity-90 transition-all duration-200 transform hover:scale-105"
            >
              {t("pendingApprovalPage.approved.ctaResume")}
            </motion.button>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Link href="/" className="inline-flex items-center justify-center rounded-full px-6 py-2.5 font-medium shadow bg-gray-200 text-gray-900 hover:bg-gray-300 transition">
                {t("pendingApprovalPage.approved.ctaHome")}
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </>
    );
  }

  // Pending state
  return (
    <div className="space-y-6 text-center">
      {/* Header Badge */}
      {headerBlock}

      {/* Description Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-2xl mx-auto">
        <h2 className="text-lg font-bold text-gray-800 pb-2">{t("pendingApprovalPage.pending.subtitle")}</h2>
        <p className="text-sm text-blue-900">{t("pendingApprovalPage.pending.body1")}</p>
        <p className="text-sm text-blue-900 mt-2">{t("pendingApprovalPage.pending.body2")}</p>
        <div className="mt-3 rounded-lg bg-blue-100 px-4 py-3 text-blue-900 text-sm">{t("pendingApprovalPage.pending.tip")}</div>
      </div>

      {/* CTA */}
      <div className="flex justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 px-6 py-2.5 text-white font-medium shadow hover:opacity-90 transition active:translate-y-[1px]"
        >
          {t("pendingApprovalPage.pending.returnHome")}
        </Link>
      </div>
    </div>
  );
}
