"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { EDriveTestOverall, type IDriveTest } from "@/types/driveTest.types";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import type { UploadResult } from "@/lib/utils/s3Upload";
import type { SignatureBoxHandle } from "@/components/react-canvas/SignatureBox";
import { ES3Folder } from "@/types/aws.types";

import { OnRoadWrapperSchema, type OnRoadWrapperInput } from "@/lib/zodSchemas/drive-test/onRoadAssessment.schema";

import OnRoadHeader from "./components/OnRoadHeader";
import OnRoadSectionsGrid from "./components/OnRoadSectionsGrid";
import OnRoadMetaFields from "./components/OnRoadMetaFields";
import OnRoadSignatureField from "./components/OnRoadSignatureField";
import OnRoadFooterActions from "./components/OnRoadFooterActions";
import OnRoadClearConfirmModal from "./components/OnRoadClearConfirmModal";
import OnRoadFailConfirmModal from "./components/OnRoadFailConfirmModal";

type Notice = { type: "success" | "error"; text: string } | null;

export type OnRoadClientProps = {
  onboardingContext: IOnboardingTrackerContext;
  driverName: string;
  driverLicense: string;

  defaultValues: OnRoadWrapperInput;
  initialSignature: UploadResult | null;
  isLocked: boolean;
  trackerId: string;
  showFlatbedToggle: boolean;

  driveTest?: IDriveTest;
};

export default function OnRoadClient({ onboardingContext, driverName, driverLicense, defaultValues, initialSignature, isLocked, trackerId, showFlatbedToggle }: OnRoadClientProps) {
  const router = useRouter();
  const resolver = zodResolver(OnRoadWrapperSchema) as unknown as Resolver<OnRoadWrapperInput>;
  const methods = useForm<OnRoadWrapperInput>({ resolver, defaultValues, mode: "onChange" });

  const sigRef = useRef<SignatureBoxHandle>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [sigDirty, setSigDirty] = useState(false);

  // Modals
  const [showClearModal, setShowClearModal] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);

  // stash payload for confirm-submit when FAIL is selected
  const [pendingPayload, setPendingPayload] = useState<OnRoadWrapperInput | null>(null);

  // initial “Back to Pre-Trip” visibility if already locked/completed
  const initialShowBack = useMemo(() => Boolean(isLocked), [isLocked]);
  const [showBackToPreTrip, setShowBackToPreTrip] = useState<boolean>(initialShowBack);

  // effective lock disables everything inside fieldset
  const effectiveLocked = isLocked || submissionComplete;

  // buttons visibility
  const isEditable = !effectiveLocked;
  const showFinish = isEditable;
  const showClear = isEditable && (methods.formState.isDirty || sigDirty);

  const handleConfirmClear = async () => {
    setShowClearModal(false);
    await sigRef.current?.clear();
    methods.reset(defaultValues, { keepDefaultValues: true });
    setNotice(null);
    setSigDirty(false);
  };

  // actual network submit
  const submitPayload = async (payload: OnRoadWrapperInput) => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/admin/onboarding/${trackerId}/drive-test/on-road-assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveTest: payload }),
      });

      const json = await res.json();

      if (!res.ok) {
        setNotice({ type: "error", text: json?.message || "Failed to save on-road assessment." });
        return;
      }

      setSubmissionComplete(true);
      setShowBackToPreTrip(true);

      const dt = json?.data?.driveTest as IDriveTest | undefined;
      const terminated = Boolean(json?.data?.onboardingDoc?.terminated);

      if (terminated) {
        setNotice({ type: "error", text: "Driver has failed and the application has been terminated." });
      } else if (dt?.onRoad?.overallAssessment === EDriveTestOverall.PASS || dt?.onRoad?.overallAssessment === EDriveTestOverall.CONDITIONAL_PASS) {
        setNotice({ type: "success", text: "On-road completed successfully." });
      } else {
        setNotice({ type: "success", text: "On-road assessment saved." });
      }
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message || "Submission failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // submit orchestrator w/ FAIL confirmation
  const orchestrateSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    // phase 1: ensure signature file present / uploaded
    setIsSubmitting(true);
    setNotice(null);

    const finalSig = await sigRef.current?.ensureUploaded();
    if (!finalSig?.s3Key || !finalSig?.url) {
      setIsSubmitting(false);
      methods.setError("onRoad.supervisorSignature.s3Key", { type: "manual", message: "Please draw or upload a signature before submitting." });
      return;
    }
    methods.setValue("onRoad.supervisorSignature", { s3Key: finalSig.s3Key, url: finalSig.url }, { shouldDirty: true, shouldValidate: false });

    // phase 2: run zod validation & branch on overall result
    await methods.handleSubmit(
      async (values) => {
        const payload: OnRoadWrapperInput = {
          ...values,
          onRoad: {
            ...values.onRoad,
            supervisorSignature: { s3Key: finalSig.s3Key, url: finalSig.url },
          },
        };

        const isFail = payload.onRoad.overallAssessment === EDriveTestOverall.FAIL;

        if (isFail) {
          // open confirm; stash payload; release loading until user decides
          setPendingPayload(payload);
          setShowFailModal(true);
          setIsSubmitting(false);
          return;
        }

        // non-fail: submit immediately
        await submitPayload(payload);
      },
      async () => {
        // validation errors
        setIsSubmitting(false);
      }
    )();
  };

  // confirm → proceed with FAIL submission
  const confirmFailAndSubmit = async () => {
    setShowFailModal(false);
    if (pendingPayload) {
      await submitPayload(pendingPayload);
      setPendingPayload(null);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={orchestrateSubmit} className="space-y-8" noValidate>
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 p-5 text-center">On-Road Assessment</h2>

        {isLocked && (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200 shadow-sm border-l-4 border-amber-500">
            <p className="text-amber-800">This on-road assessment has already been completed and the outcome cannot be changed.</p>
          </div>
        )}

        <fieldset disabled={effectiveLocked} className="space-y-8">
          <OnRoadHeader driverName={driverName} driverLicense={driverLicense} />
          <OnRoadSectionsGrid isLocked={effectiveLocked} />
          <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-200 shadow-sm space-y-5">
            <OnRoadMetaFields isLocked={effectiveLocked} showFlatbedToggle={showFlatbedToggle} onboardingContext={onboardingContext} />
            <OnRoadSignatureField
              sigRef={sigRef}
              trackerId={trackerId}
              s3Folder={ES3Folder.SIGNATURES}
              isLocked={effectiveLocked}
              initialSignature={initialSignature}
              onSignatureDirtyChange={setSigDirty}
            />
          </div>
        </fieldset>

        {notice && (
          <div className={["rounded-2xl bg-white p-4 ring-1 ring-gray-200 shadow-sm", "border-l-4", notice.type === "success" ? "border-green-500" : "border-red-500"].join(" ")}>
            <p className={notice.type === "success" ? "text-green-700" : "text-red-700"}>{notice.text}</p>
          </div>
        )}

        <OnRoadFooterActions
          showFinish={showFinish}
          showClear={showClear}
          showBackToPreTrip={showBackToPreTrip}
          isSubmitting={isSubmitting}
          onClear={() => setShowClearModal(true)}
          onBackToPreTrip={() => router.push(`/appraisal/${trackerId}/drive-test/pre-trip-assessment`)}
        />
      </form>

      {/* Modals */}
      <OnRoadClearConfirmModal open={showClearModal} onCancel={() => setShowClearModal(false)} onConfirm={handleConfirmClear} />
      <OnRoadFailConfirmModal open={showFailModal} onCancel={() => setShowFailModal(false)} onConfirm={confirmFailAndSubmit} />
    </FormProvider>
  );
}
