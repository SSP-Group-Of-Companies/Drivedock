"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "next/navigation";
import useMounted from "@/hooks/useMounted";
import { X } from "lucide-react";
import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import type { IFileAsset } from "@/types/shared.types";
import type { ApplicationFormPage4Input } from "@/lib/zodSchemas/applicationFormPage4.Schema";
import { useEffect, useState } from "react";
import UploadPicker from "@/components/media/UploadPicker";

export default function FastCardSection({
  isCanadian,
}: {
  isCanadian: boolean;
}) {
  const mounted = useMounted();
  const { t } = useTranslation("common");
  const { id } = useParams<{ id: string }>();

  const {
    register,
    setValue,
    control,
    formState: { errors },
    clearErrors,
  } = useFormContext<ApplicationFormPage4Input>();

  const num = useWatch({
    control,
    name: "fastCard.fastCardNumber",
  }) as string | undefined;
  const exp = useWatch({
    control,
    name: "fastCard.fastCardExpiry",
  }) as string | undefined;
  const front = useWatch({
    control,
    name: "fastCard.fastCardFrontPhoto",
  }) as IFileAsset | undefined;
  const back = useWatch({
    control,
    name: "fastCard.fastCardBackPhoto",
  }) as IFileAsset | undefined;

  const [frontStatus, setFrontStatus] = useState<
    "idle" | "uploading" | "deleting" | "error"
  >("idle");
  const [backStatus, setBackStatus] = useState<
    "idle" | "uploading" | "deleting" | "error"
  >("idle");
  const [frontMsg, setFrontMsg] = useState("");
  const [backMsg, setBackMsg] = useState("");

  // handy alias to the nested error object
  const fcErr = (errors.fastCard as any) || {};

  // Register FAST Card file fields with RHF
  useEffect(() => {
    register("fastCard.fastCardFrontPhoto");
    register("fastCard.fastCardBackPhoto");
  }, [register]);

  // If all fields are empty, clear FAST-specific errors to keep it truly optional
  useEffect(() => {
    const allEmpty = !num?.trim() && !exp && !front && !back;
    if (allEmpty) {
      clearErrors([
        "fastCard.fastCardNumber",
        "fastCard.fastCardExpiry",
        "fastCard.fastCardFrontPhoto",
        "fastCard.fastCardBackPhoto",
      ]);
    }
  }, [num, exp, front, back, clearErrors]);

  const uploadSide = async (file: File | null, side: "front" | "back") => {
    const setStatus = side === "front" ? setFrontStatus : setBackStatus;
    const setMsg = side === "front" ? setFrontMsg : setBackMsg;
    const field =
      side === "front"
        ? "fastCard.fastCardFrontPhoto"
        : "fastCard.fastCardBackPhoto";

    if (!file) {
      setValue(field as any, undefined, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setStatus("idle");
      setMsg("");
      return;
    }

    if (file.type !== "application/pdf") {
      setStatus("error");
      setMsg(
        t(
          "form.step2.page4.fastCard.pdfOnlyError",
          "Only PDF files are allowed. Please upload a PDF scan of your FAST card."
        )
      );
      return;
    }

    try {
      setStatus("uploading");
      setMsg("");
      const res = await uploadToS3Presigned({
        file,
        folder: ES3Folder.FAST_CARD_PHOTOS,
        trackerId: id,
      } as any);
      setValue(field as any, res, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setStatus("idle");
      setMsg(
        t(
          "form.step2.page4.fastCard.uploadSuccess",
          "Document uploaded successfully."
        )
      );
    } catch (e: any) {
      setStatus("error");
      setMsg(
        e?.message ||
          t(
            "form.step2.page4.fastCard.uploadFailed",
            "Upload failed. Please try again."
          )
      );
    }
  };

  const removeSide = async (side: "front" | "back") => {
    const value = side === "front" ? front : back;
    const setStatus = side === "front" ? setFrontStatus : setBackStatus;
    const setMsg = side === "front" ? setFrontMsg : setBackMsg;
    const field =
      side === "front"
        ? "fastCard.fastCardFrontPhoto"
        : "fastCard.fastCardBackPhoto";

    try {
      setStatus("deleting");
      setMsg("");
      if (value?.s3Key?.startsWith("temp-files/")) {
        await fetch("/api/v1/delete-temp-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: [value.s3Key] }),
        });
        setMsg(
          t(
            "form.step2.page4.fastCard.removed",
            "Document removed. You can upload a new file if needed."
          )
        );
      }
    } catch {
      setStatus("error");
      setMsg(
        t(
          "form.step2.page4.fastCard.deleteFailed",
          "Delete failed. Please try again."
        )
      );
    } finally {
      setValue(field as any, undefined, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setStatus("idle");
    }
  };

  // Don’t mount this section for US applicants
  if (!mounted || !isCanadian) return null;

  return (
    <section
      className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white shadow-sm"
      data-field="fastCard"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800">
          {t("form.step2.page4.sections.fastCard.title", "FAST Card")}
        </h2>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <p className="text-sm text-gray-700 text-center">
          {t(
            "form.step2.page4.sections.fastCard.disclaimer",
            "This section is optional. However, if you provide any FAST Card information, you must complete all fields and upload both front and back documents as clear PDF scans."
          )}
        </p>
      </div>

      {/* Row 1: FAST Card Number and Expiry Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.step2.page4.fields.fastNumber", "FAST Card Number")}
          </label>
          <input
            {...register("fastCard.fastCardNumber")}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500"
            data-field="fastCard.fastCardNumber"
            aria-invalid={!!fcErr.fastCardNumber}
          />
          {fcErr.fastCardNumber?.message && (
            <p className="text-red-500 text-xs mt-1" role="alert">
              {fcErr.fastCardNumber.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.step2.page4.fields.fastExpiry", "Expiry Date")}
          </label>
          <input
            type="date"
            {...register("fastCard.fastCardExpiry")}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500"
            data-field="fastCard.fastCardExpiry"
            aria-invalid={!!fcErr.fastCardExpiry}
          />
          {fcErr.fastCardExpiry?.message && (
            <p className="text-red-500 text-xs mt-1" role="alert">
              {fcErr.fastCardExpiry.message}
            </p>
          )}
        </div>
      </div>

      {/* Row 2: Front + Back PDF uploads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Front */}
        <div data-field="fastCard.fastCardFrontPhoto">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.step2.page4.fields.fastFront", "FAST Card Front (PDF)")}
          </label>

          {front?.url ? (
            <div className="relative rounded-md border border-gray-200 bg-gray-50 px-3 py-2 flex items-start justify-between gap-3">
              <div className="pr-8">
                <p className="text-sm font-medium text-gray-800 line-clamp-1">
                  {front.originalName || "FAST-Front.pdf"}
                </p>
                <p className="text-xs text-gray-500">
                  {t(
                    "form.step2.page4.fastCard.frontAttached",
                    "PDF attached. You can upload a new file to replace it."
                  )}
                </p>
                {front.url && (
                  <a
                    href={front.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex text-xs font-medium text-blue-600 hover:underline"
                  >
                    {t(
                      "form.step2.page4.fastCard.viewDocument",
                      "View document"
                    )}
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeSide("front")}
                disabled={
                  frontStatus === "uploading" || frontStatus === "deleting"
                }
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                aria-label={t("form.step2.actions.removeFile", "Remove file")}
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <UploadPicker
              label={t(
                "form.step2.page4.fields.uploadFront",
                "Upload FAST front (PDF)"
              )}
              onPick={(file) => uploadSide(file, "front")}
              mode="pdf"
              showPdfGuidance
              accept="application/pdf"
              className="w-full"
            />
          )}

          {frontStatus === "uploading" && (
            <p className="text-yellow-600 text-xs mt-1">
              {t("form.step3.status.uploading", "Uploading...")}
            </p>
          )}
          {frontStatus === "error" && (
            <p className="text-red-500 text-xs mt-1">{frontMsg}</p>
          )}
          {frontStatus === "idle" && frontMsg && (
            <p className="text-green-600 text-xs mt-1">{frontMsg}</p>
          )}

          {/* Zod error for front */}
          {fcErr.fastCardFrontPhoto?.message && (
            <p className="text-red-500 text-xs mt-1" role="alert">
              {fcErr.fastCardFrontPhoto.message}
            </p>
          )}
        </div>

        {/* Back */}
        <div data-field="fastCard.fastCardBackPhoto">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.step2.page4.fields.fastBack", "FAST Card Back (PDF)")}
          </label>

          {back?.url ? (
            <div className="relative rounded-md border border-gray-200 bg-gray-50 px-3 py-2 flex items-start justify-between gap-3">
              <div className="pr-8">
                <p className="text-sm font-medium text-gray-800 line-clamp-1">
                  {back.originalName || "FAST-Back.pdf"}
                </p>
                <p className="text-xs text-gray-500">
                  {t(
                    "form.step2.page4.fastCard.backAttached",
                    "PDF attached. You can upload a new file to replace it."
                  )}
                </p>
                {back.url && (
                  <a
                    href={back.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex text-xs font-medium text-blue-600 hover:underline"
                  >
                    {t(
                      "form.step2.page4.fastCard.viewDocument",
                      "View document"
                    )}
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeSide("back")}
                disabled={
                  backStatus === "uploading" || backStatus === "deleting"
                }
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                aria-label={t("form.step2.actions.removeFile", "Remove file")}
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <UploadPicker
              label={t(
                "form.step2.page4.fields.uploadBack",
                "Upload FAST back (PDF)"
              )}
              onPick={(file) => uploadSide(file, "back")}
              mode="pdf"
              showPdfGuidance
              accept="application/pdf"
              className="w-full"
            />
          )}

          {backStatus === "uploading" && (
            <p className="text-yellow-600 text-xs mt-1">
              {t("form.step3.status.uploading", "Uploading...")}
            </p>
          )}
          {backStatus === "error" && (
            <p className="text-red-500 text-xs mt-1">{backMsg}</p>
          )}
          {backStatus === "idle" && backMsg && (
            <p className="text-green-600 text-xs mt-1">{backMsg}</p>
          )}

          {/* Zod error for back */}
          {fcErr.fastCardBackPhoto?.message && (
            <p className="text-red-500 text-xs mt-1" role="alert">
              {fcErr.fastCardBackPhoto.message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
