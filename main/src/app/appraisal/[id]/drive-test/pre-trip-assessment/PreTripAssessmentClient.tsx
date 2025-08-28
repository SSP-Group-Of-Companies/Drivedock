"use client";

import { useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { EDriveTestOverall, type IDriveTest } from "@/types/driveTest.types";
import { PreTripWrapperInput, PreTripWrapperSchema } from "@/lib/zodSchemas/drive-test/preTripAssessment.schema";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import type { UploadResult } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";

import PreTripHeader from "./components/PreTripHeader";
import PreTripSectionsGrid from "./components/PreTripSectionsGrid";
import PreTripMetaFields from "./components/PreTripMetaFields";
import PreTripFooterActions from "./components/PreTripFooterActions";
import PreTripSignatureField from "./components/PreTripSignatureField";
import PreTripClearConfirmModal from "./components/PreTripClearConfirmModal";
import PreTripFailConfirmModal from "./components/PreTripFailConfirmModal";

import type { SignatureBoxHandle } from "@/components/react-canvas/SignatureBox";

export type PreTripClientProps = {
  onboardingContext: IOnboardingTrackerContext;
  driverName: string;
  driverLicense: string;

  // Provided by server
  defaultValues: PreTripWrapperInput;
  initialSignature: UploadResult | null;
  isLocked: boolean;
  trackerId: string;

  // Optional
  driveTest?: IDriveTest;
};

type Notice = { type: "success"; text: string } | { type: "error"; text: string } | null;

export default function PreTripClient({ driverName, driverLicense, defaultValues, initialSignature, isLocked, trackerId }: PreTripClientProps) {
  const router = useRouter();
  const resolver = zodResolver(PreTripWrapperSchema) as unknown as Resolver<PreTripWrapperInput>;

  const methods = useForm<PreTripWrapperInput>({
    resolver,
    defaultValues,
    mode: "onChange",
  });

  const sigRef = useRef<SignatureBoxHandle>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [sigDirty, setSigDirty] = useState(false);

  // Initial "Go to On Road" visibility when page is already locked & passed
  const initialCanGoToOnRoad = useMemo(() => {
    const overall = defaultValues?.preTrip?.overallAssessment as EDriveTestOverall | undefined;
    return !!isLocked && (overall === EDriveTestOverall.PASS || overall === EDriveTestOverall.CONDITIONAL_PASS);
  }, [isLocked, defaultValues]);
  const [canGoToOnRoad, setCanGoToOnRoad] = useState<boolean>(initialCanGoToOnRoad);

  // Disable the whole form if locked OR after a successful submission
  const effectiveLocked = isLocked || submissionComplete;

  // Show buttons based on state:
  const isEditable = !effectiveLocked; // allowed to edit?
  const showFinish = isEditable; // always show Finish when editable
  const showClear = isEditable && (methods.formState.isDirty || sigDirty); // show Clear only if changed
  const showGoToOnRoad = canGoToOnRoad; // only when passed

  // Clear modal
  const [showClearModal, setShowClearModal] = useState(false);
  const handleConfirmClear = async () => {
    setShowClearModal(false);
    await sigRef.current?.clear(); // clears signature + temp files
    methods.reset(defaultValues, { keepDefaultValues: true });
    setNotice(null);
    setSigDirty(false);
  };

  // NEW: Fail confirmation modal (when overall = fail)
  const [showFailModal, setShowFailModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<PreTripWrapperInput | null>(null);

  // Actual network submit
  const submitPayload = async (payload: PreTripWrapperInput) => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/admin/onboarding/${trackerId}/drive-test/pre-trip-assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveTest: payload }),
      });

      const json = await res.json();

      if (!res.ok) {
        setNotice({ type: "error", text: json?.message || "Failed to save pre-trip assessment." });
        return;
      }

      setSubmissionComplete(true);

      // Determine outcome: use onboardingDoc.terminated (server may delete/alter subdoc on fail)
      const terminated = Boolean(json?.data?.onboardingDoc?.terminated);
      const dt = json?.data?.driveTest as IDriveTest | undefined;

      if (terminated) {
        setNotice({
          type: "error",
          text: "Driver has failed and the application has been terminated.",
        });
        setCanGoToOnRoad(false);
      } else {
        const passed = dt?.preTrip?.overallAssessment === EDriveTestOverall.PASS || dt?.preTrip?.overallAssessment === EDriveTestOverall.CONDITIONAL_PASS;

        if (passed) {
          setNotice({
            type: "success",
            text: "Pre-trip completed. Please click “Go to On Road” to continue to the On-Road assessment.",
          });
          setCanGoToOnRoad(true);
        } else {
          // non-terminated & not pass → treat as saved (edge case)
          setNotice({
            type: "success",
            text: "Pre-trip assessment saved.",
          });
          setCanGoToOnRoad(false);
        }
      }
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message || "Submission failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload signature before Zod validation, then submit (with FAIL confirm)
  const orchestrateSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    if (isLocked) {
      router.push(`/onboarding/${trackerId}/drive-test/on-road-assessment`);
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    const finalSig = await sigRef.current?.ensureUploaded();

    if (!finalSig?.s3Key || !finalSig?.url) {
      setIsSubmitting(false);
      methods.setError("preTrip.supervisorSignature.s3Key", {
        type: "manual",
        message: "Please draw or upload a signature before submitting.",
      });
      return;
    }

    methods.setValue("preTrip.supervisorSignature", { s3Key: finalSig.s3Key, url: finalSig.url }, { shouldDirty: true, shouldValidate: false });

    await methods.handleSubmit(
      async (values) => {
        const payload: PreTripWrapperInput = {
          ...values,
          preTrip: {
            ...values.preTrip,
            supervisorSignature: { s3Key: finalSig.s3Key, url: finalSig.url },
          },
        };

        const isFail = payload.preTrip.overallAssessment === EDriveTestOverall.FAIL;

        if (isFail) {
          setPendingPayload(payload);
          setShowFailModal(true);
          setIsSubmitting(false);
          return;
        }

        await submitPayload(payload);
      },
      async () => {
        setIsSubmitting(false);
      }
    )();
  };

  // Confirm FAIL → proceed
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
        {/* Locked banner if already taken */}
        {isLocked && (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200 shadow-sm border-l-4 border-amber-500">
            <p className="text-amber-800">This pre-trip assessment has already been completed and the outcome cannot be changed.</p>
          </div>
        )}

        {/* Disable everything inside when effectiveLocked */}
        <fieldset disabled={effectiveLocked} className="space-y-8">
          <PreTripHeader driverName={driverName} driverLicense={driverLicense} />

          <PreTripSectionsGrid isLocked={effectiveLocked} />

          <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-200 shadow-sm space-y-5">
            <PreTripMetaFields isLocked={effectiveLocked} />

            <PreTripSignatureField
              sigRef={sigRef}
              trackerId={trackerId}
              s3Folder={ES3Folder.SIGNATURES}
              isLocked={effectiveLocked}
              initialSignature={initialSignature}
              onSignatureDirtyChange={setSigDirty}
            />
          </div>
        </fieldset>

        {/* Submission message card */}
        {notice && (
          <div className={["rounded-2xl bg-white p-4 ring-1 ring-gray-200 shadow-sm", "border-l-4", notice.type === "success" ? "border-green-500" : "border-red-500"].join(" ")}>
            <p className={notice.type === "success" ? "text-green-700" : "text-red-700"}>{notice.text}</p>
          </div>
        )}

        <PreTripFooterActions
          // Visibility flags
          showFinish={showFinish}
          showClear={showClear}
          showGoToOnRoad={showGoToOnRoad}
          // Behaviors
          isSubmitting={isSubmitting}
          onClear={() => setShowClearModal(true)}
          onGoToOnRoad={() => router.push(`/appraisal/${trackerId}/drive-test/on-road-assessment`)}
        />
      </form>

      {/* Clear confirmation modal */}
      <PreTripClearConfirmModal open={showClearModal} onCancel={() => setShowClearModal(false)} onConfirm={handleConfirmClear} />

      {/* NEW: Fail → Terminate confirmation modal */}
      <PreTripFailConfirmModal open={showFailModal} onCancel={() => setShowFailModal(false)} onConfirm={confirmFailAndSubmit} />
    </FormProvider>
  );
}
