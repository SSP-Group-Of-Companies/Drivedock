// src/app/onboarding/[id]/drug-test/DrugTestClient.tsx
"use client";

// React and library imports
import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Hourglass, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

import useMounted from "@/hooks/useMounted";
import { ES3Folder } from "@/types/aws.types";
import type { IFileAsset } from "@/types/shared.types";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import type { IDrugTestDoc } from "@/types/drugTest.types";
import { EDrugTestStatus } from "@/types/drugTest.types";
import { buildOnboardingStepPath } from "@/lib/utils/onboardingUtils";
import OnboardingPhotoGroupControlled from "../../components/OnboardingPhotoGroupControlled";
import { Confetti } from "@/components/shared";

export type DrugTestClientProps = {
  drugTest: Partial<IDrugTestDoc>;
  onboardingContext: IOnboardingTrackerContext;
};

const MAX_PHOTOS = 5;

export default function DrugTestClient({
  drugTest,
  onboardingContext,
}: DrugTestClientProps) {
  const mounted = useMounted();
  const router = useRouter();
  const { t } = useTranslation();

  // Keep a local, mutable copy of onboardingContext so we can update from PATCH response
  const [ctx, setCtx] = useState<IOnboardingTrackerContext>(onboardingContext);
  const trackerId = ctx.id;

  // Drive UI from local status; initialize from server
  const [status, setStatus] = useState<EDrugTestStatus>(
    drugTest.status ?? EDrugTestStatus.NOT_UPLOADED
  );

  // RULE: ignore any server-provided driverDocuments if NOT_UPLOADED
  const initialPhotos: IFileAsset[] =
    (drugTest.status ?? EDrugTestStatus.NOT_UPLOADED) ===
    EDrugTestStatus.NOT_UPLOADED
      ? []
      : drugTest.driverDocuments ?? [];

  const [photos, setPhotos] = useState<IFileAsset[]>(initialPhotos);
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const completed = status === EDrugTestStatus.APPROVED;
  const isPending = status === EDrugTestStatus.AWAITING_REVIEW;
  const isRejected = status === EDrugTestStatus.REJECTED;

  // Show confetti when drug test is completed (only once)
  useEffect(() => {
    if (completed) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [completed]);

  /**
   * Upload enablement:
   * - NOT_UPLOADED  -> can upload
   * - REJECTED      -> can re-upload
   * - AWAITING_REVIEW:
   *      - If driver has not uploaded anything yet (driverDocuments empty AND no staged photos), allow upload.
   *      - Otherwise, block (normal pending state).
   */
  const hasNoDriverDocs =
    (drugTest.driverDocuments?.length ?? 0) === 0 && photos.length === 0;
  const canUpload =
    status === EDrugTestStatus.NOT_UPLOADED ||
    isRejected ||
    (status === EDrugTestStatus.AWAITING_REVIEW && hasNoDriverDocs);

  const headerBlock = useMemo(() => {
    if (completed) {
      return (
        <div className="rounded-xl bg-green-50 ring-1 ring-green-100 p-4 flex items-center gap-2">
          <CheckCircle2 className="text-green-600 w-5 h-5" />
          <p className="text-sm text-green-800 font-medium">
            {t("form.step6.verified")}
          </p>
        </div>
      );
    }
    // If pending but the driver hasn't uploaded anything yet (allowed to upload), show the neutral description instead of "pending"
    if (isPending && !canUpload) {
      return (
        <div className="rounded-xl bg-amber-50 ring-1 ring-amber-100 p-4 flex items-center gap-2 justify-center">
          <Hourglass className="text-amber-600 w-5 h-5" />
          <p className="text-sm text-amber-800 font-medium">
            {t("form.step6.pending")}
          </p>
        </div>
      );
    }
    if (isRejected) {
      return (
        <div className="rounded-xl bg-red-50 ring-1 ring-red-100 p-4 flex items-center gap-2">
          <XCircle className="text-red-600 w-5 h-5" />
          <p className="text-sm text-red-800 font-medium">
            {t(
              "form.step6.rejected",
              "Your drug test driverDocuments were rejected. Please re-upload and re-submit."
            )}
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <p className="text-sm text-gray-700 text-center">
          {t("form.step6.description", { count: MAX_PHOTOS })}
        </p>
      </div>
    );
  }, [completed, isPending, isRejected, canUpload, t]);

  const handleContinue = useCallback(() => {
    const next = ctx.nextStep;
    if (next) {
      router.push(buildOnboardingStepPath(ctx, next));
    } else {
      router.push(`/onboarding/${trackerId}/completed`);
    }
  }, [ctx, router, trackerId]);

  const submit = async () => {
    if (!canUpload || photos.length === 0 || submitting) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/v1/onboarding/${trackerId}/drug-test`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverDocuments: photos.map(
            (p) =>
              ({
                s3Key: p.s3Key,
                url: p.url,
                mimeType: p.mimeType,
                sizeInBytes: p.sizeBytes,
                originalName: p.originalName,
              } as IFileAsset)
          ),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to submit driverDocuments.");
      }

      // Update local state from server response
      const updatedDrugTest: Partial<IDrugTestDoc> = data?.data?.drugTest ?? {};
      const updatedCtx: IOnboardingTrackerContext | undefined =
        data?.data?.onboardingContext;

      if (updatedCtx) setCtx(updatedCtx);
      if (Array.isArray(updatedDrugTest.driverDocuments)) {
        setPhotos(updatedDrugTest.driverDocuments as IFileAsset[]);
      }
      setStatus(updatedDrugTest.status ?? EDrugTestStatus.AWAITING_REVIEW);
      // Stay on page; UI will now show "Pending review" unless canUpload remains true (i.e., still no driver docs)
    } catch (e) {
      console.error(e);
      // Optional: toast error
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  // Show congratulatory screen when completed
  if (completed) {
    return (
      <>
        {showConfetti && <Confetti />}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          {/* Drug Test Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center p-2"
          >
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </motion.div>

          {/* Congratulations Message */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 max-w-2xl mx-auto">
            <h2 className="text-lg font-bold text-gray-800 pb-2">
              {t("form.step6.success.title")}
            </h2>
            <p className="text-sm text-green-800 max-w-2xl mx-auto">
              {t("form.step6.success.message")}
            </p>
          </div>

          {/* Continue Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            onClick={handleContinue}
            className="px-8 py-3 bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white font-semibold rounded-full shadow-lg hover:opacity-90 transition-all duration-200 transform hover:scale-105"
          >
            {t("form.step6.success.continueButton")}
          </motion.button>
        </motion.div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {headerBlock}

      {canUpload ? (
        <>
          <OnboardingPhotoGroupControlled
            label={t("form.step6.labeldriverDocuments")}
            folder={ES3Folder.DRUG_TEST_DOCS}
            maxPhotos={MAX_PHOTOS}
            photos={photos}
            setPhotos={setPhotos}
          />

          <div className="flex justify-center">
            <button
              type="button"
              onClick={submit}
              disabled={photos.length === 0 || submitting}
              className={`px-8 py-2 mt-2 rounded-full font-semibold transition-colors shadow-md
                ${
                  photos.length === 0 || submitting
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90"
                }`}
            >
              {isRejected
                ? t(
                    "actions.resubmitdriverDocuments",
                    "Re-submit driverDocuments"
                  )
                : submitting
                ? t("actions.submitting", "Submitting...")
                : t("actions.submitdriverDocuments")}
            </button>
          </div>
        </>
      ) : (
        <div className="flex justify-center">
          <button
            type="button"
            disabled
            className="px-8 py-2 mt-2 rounded-full font-semibold transition-colors shadow-md bg-gray-400 text-white cursor-not-allowed"
          >
            {t("actions.pendingVerification")}
          </button>
        </div>
      )}
    </div>
  );
}
