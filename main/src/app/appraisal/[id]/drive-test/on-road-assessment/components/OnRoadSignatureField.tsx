"use client";

import { memo } from "react";
import { useFormContext } from "react-hook-form";
import SignatureBox, { type SignatureBoxHandle } from "@/components/react-canvas/SignatureBox";
import type { UploadResult } from "@/lib/utils/s3Upload";
import type { OnRoadWrapperInput } from "@/lib/zodSchemas/drive-test/onRoadAssessment.schema";
import { ES3Folder } from "@/types/aws.types";

type Props = {
  sigRef: React.RefObject<SignatureBoxHandle | null>;
  trackerId: string;
  s3Folder: ES3Folder;
  isLocked: boolean;
  initialSignature: UploadResult | null;
  onSignatureDirtyChange?: (dirty: boolean) => void;
};

function OnRoadSignatureField({ sigRef, trackerId, s3Folder, isLocked, initialSignature, onSignatureDirtyChange }: Props) {
  const {
    setValue,
    clearErrors,
    formState: { errors },
  } = useFormContext<OnRoadWrapperInput>();

  const sigS3Err = errors?.onRoad?.supervisorSignature?.s3Key?.message as string | undefined;
  const sigUrlErr = errors?.onRoad?.supervisorSignature?.url?.message as string | undefined;
  const sigExternalError = sigS3Err || sigUrlErr;

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-800">Supervisor Signature</div>
      <div className="rounded-xl ring-1 ring-gray-200 bg-gray-50 p-3">
        <SignatureBox
          ref={sigRef}
          trackerId={trackerId}
          s3Folder={s3Folder}
          initialSignature={initialSignature ?? null}
          labels={{
            hint: "Sign inside the box",
            upload: "Upload",
            clear: "Clear",
            uploading: "Uploading...",
            deleting: "Deleting...",
            uploadSuccess: "Upload successful",
            uploadFailedGeneric: "Failed to process or upload your signature. Please try again.",
            mustSignOrUpload: "Please draw or upload a signature before submitting.",
          }}
          disabled={isLocked}
          className="mt-1"
          errorMsg={sigExternalError}
          onDrawStateChange={({ hasUnuploadedDrawing }) => {
            if (hasUnuploadedDrawing) clearErrors(["onRoad.supervisorSignature.s3Key", "onRoad.supervisorSignature.url"]);
          }}
          onDirtyChange={(dirty) => onSignatureDirtyChange?.(dirty)}
          onUploaded={(result: UploadResult) => {
            setValue("onRoad.supervisorSignature", { s3Key: result.s3Key, url: result.url }, { shouldDirty: true, shouldValidate: true });
            clearErrors(["onRoad.supervisorSignature.s3Key", "onRoad.supervisorSignature.url"]);
          }}
          onCleared={() => {
            setValue("onRoad.supervisorSignature", { s3Key: "", url: "" }, { shouldDirty: true, shouldValidate: true });
          }}
          onError={(msg) => console.warn("Signature error:", msg)}
        />
      </div>
      <p className="text-xs text-gray-500 text-center">
        Draw your signature or upload an image, then click <strong>Finish Test</strong>.
      </p>
    </div>
  );
}

export default memo(OnRoadSignatureField);
