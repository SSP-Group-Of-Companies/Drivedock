// src/app/onboarding/[id]/drug-test/DrugTestClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Hourglass, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import useMounted from "@/hooks/useMounted";
import { ES3Folder } from "@/types/aws.types";
import type { IPhoto } from "@/types/shared.types";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import type { IDrugTestDoc } from "@/types/drugTest.types";
import { EDrugTestStatus } from "@/types/drugTest.types";
import { buildOnboardingStepPath } from "@/lib/utils/onboardingUtils";
import OnboardingPhotoGroupControlled from "../../components/OnboardingPhotoGroupControlled";

export type DrugTestClientProps = {
  drugTest: Partial<IDrugTestDoc>;
  onboardingContext: IOnboardingTrackerContext;
};

const MAX_PHOTOS = 5;

export default function DrugTestClient({ drugTest, onboardingContext }: DrugTestClientProps) {
  const mounted = useMounted();
  const router = useRouter();
  const { t } = useTranslation();

  // Keep a local, mutable copy of onboardingContext so we can update from PATCH response
  const [ctx, setCtx] = useState<IOnboardingTrackerContext>(onboardingContext);
  const trackerId = ctx.id;

  // Drive UI from local status; initialize from server
  const [status, setStatus] = useState<EDrugTestStatus>(drugTest.status ?? EDrugTestStatus.NOT_UPLOADED);

  // RULE: ignore any server-provided documents if NOT_UPLOADED
  const initialPhotos: IPhoto[] = (drugTest.status ?? EDrugTestStatus.NOT_UPLOADED) === EDrugTestStatus.NOT_UPLOADED ? [] : drugTest.documents ?? [];

  const [photos, setPhotos] = useState<IPhoto[]>(initialPhotos);
  const [submitting, setSubmitting] = useState(false);

  const completed = status === EDrugTestStatus.APPROVED;
  const isPending = status === EDrugTestStatus.AWAITING_REVIEW;
  const isRejected = status === EDrugTestStatus.REJECTED;

  // canUpload when nothing uploaded yet OR previously rejected
  const canUpload = status === EDrugTestStatus.NOT_UPLOADED || isRejected;

  const headerBlock = useMemo(() => {
    if (completed) {
      return (
        <div className="rounded-xl bg-green-50 ring-1 ring-green-100 p-4 flex items-center gap-2">
          <CheckCircle2 className="text-green-600 w-5 h-5" />
          <p className="text-sm text-green-800 font-medium">{t("form.step6.verified")}</p>
        </div>
      );
    }
    if (isPending) {
      return (
        <div className="rounded-xl bg-amber-50 ring-1 ring-amber-100 p-4 flex items-center gap-2 justify-center">
          <Hourglass className="text-amber-600 w-5 h-5" />
          <p className="text-sm text-amber-800 font-medium">{t("form.step6.pending")}</p>
        </div>
      );
    }
    if (isRejected) {
      return (
        <div className="rounded-xl bg-red-50 ring-1 ring-red-100 p-4 flex items-center gap-2">
          <XCircle className="text-red-600 w-5 h-5" />
          <p className="text-sm text-red-800 font-medium">{t("form.step6.rejected", "Your drug test documents were rejected. Please re-upload and re-submit.")}</p>
        </div>
      );
    }
    return (
      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <p className="text-sm text-gray-700 text-center">{t("form.step6.description", { count: MAX_PHOTOS })}</p>
      </div>
    );
  }, [completed, isPending, isRejected, t]);

  const goNextFromApproved = () => {
    const next = ctx.nextStep;
    if (next) {
      router.push(buildOnboardingStepPath(ctx, next));
    } else {
      router.push(`/onboarding/${trackerId}/finished`);
    }
  };

  const submit = async () => {
    if (!canUpload || photos.length === 0 || submitting) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/v1/onboarding/${trackerId}/drug-test`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: photos.map((p) => ({ s3Key: p.s3Key, url: p.url })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to submit documents.");
      }

      // Update local state from server response:
      // - finalized docs (now in submissions folder)
      // - status -> AWAITING_REVIEW
      // - onboardingContext updated for future navigation
      const updatedDrugTest: Partial<IDrugTestDoc> = data?.data?.drugTest ?? {};
      const updatedCtx: IOnboardingTrackerContext | undefined = data?.data?.onboardingContext;

      if (updatedCtx) setCtx(updatedCtx);
      if (Array.isArray(updatedDrugTest.documents)) setPhotos(updatedDrugTest.documents as IPhoto[]);
      setStatus(updatedDrugTest.status ?? EDrugTestStatus.AWAITING_REVIEW);

      // Stay on the page; UI will now show "Pending review"
    } catch (e) {
      console.error(e);
      // Optional: toast error
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {headerBlock}

      {canUpload ? (
        <>
          <OnboardingPhotoGroupControlled label={t("form.step6.labelDocuments")} folder={ES3Folder.DRUG_TEST_PHOTOS} maxPhotos={MAX_PHOTOS} photos={photos} setPhotos={setPhotos} />

          <div className="flex justify-center">
            <button
              type="button"
              onClick={submit}
              disabled={photos.length === 0 || submitting}
              className={`px-8 py-2 mt-2 rounded-full font-semibold transition-colors shadow-md
                ${photos.length === 0 || submitting ? "bg-gray-400 text-white cursor-not-allowed" : "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90"}`}
            >
              {isRejected ? t("actions.resubmitDocuments", "Re-submit Documents") : submitting ? t("actions.submitting", "Submitting...") : t("actions.submitDocuments")}
            </button>
          </div>
        </>
      ) : (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => completed && goNextFromApproved()}
            disabled={!completed}
            className={`px-8 py-2 mt-2 rounded-full font-semibold transition-colors shadow-md
              ${completed ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-400 text-white cursor-not-allowed"}`}
          >
            {completed ? t("actions.continue") : t("actions.pendingVerification")}
          </button>
        </div>
      )}
    </div>
  );
}
