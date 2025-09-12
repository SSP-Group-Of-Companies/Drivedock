"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "next/navigation";
import useMounted from "@/hooks/useMounted";
import Image from "next/image";
import { Camera, X } from "lucide-react"; // ✅ NEW
import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import type { IFileAsset } from "@/types/shared.types";
import type { ApplicationFormPage4Input } from "@/lib/zodSchemas/applicationFormPage4.Schema";
import { useEffect, useState } from "react"; // ✅ UPDATED

export default function FastCardSection({ isCanadian }: { isCanadian: boolean }) {
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

  const num = useWatch({ control, name: "fastCard.fastCardNumber" }) as string | undefined;
  const exp = useWatch({ control, name: "fastCard.fastCardExpiry" }) as string | undefined;
  const front = useWatch({ control, name: "fastCard.fastCardFrontPhoto" }) as IFileAsset | undefined;
  const back = useWatch({ control, name: "fastCard.fastCardBackPhoto" }) as IFileAsset | undefined;

  const [frontStatus, setFrontStatus] = useState<"idle" | "uploading" | "deleting" | "error">("idle");
  const [backStatus, setBackStatus] = useState<"idle" | "uploading" | "deleting" | "error">("idle");
  const [frontMsg, setFrontMsg] = useState("");
  const [backMsg, setBackMsg] = useState("");

  // handy alias to the nested error object
  const fcErr = (errors.fastCard as any) || {};

  useEffect(() => {
    const allEmpty = !num?.trim() && !exp && !front && !back;
    if (allEmpty) {
      clearErrors(["fastCard.fastCardNumber", "fastCard.fastCardExpiry", "fastCard.fastCardFrontPhoto", "fastCard.fastCardBackPhoto"]);
    }
  }, [num, exp, front, back, clearErrors]);

  const uploadSide = async (file: File | null, side: "front" | "back") => {
    const setStatus = side === "front" ? setFrontStatus : setBackStatus;
    const setMsg = side === "front" ? setFrontMsg : setBackMsg;
    const field = side === "front" ? "fastCard.fastCardFrontPhoto" : "fastCard.fastCardBackPhoto";

    if (!file) {
      setValue(field as any, undefined, { shouldValidate: true, shouldDirty: true });
      setStatus("idle");
      setMsg("");
      return;
    }

    try {
      setStatus("uploading");
      setMsg("");
      const res = await uploadToS3Presigned({ file, folder: ES3Folder.FAST_CARD_PHOTOS, trackerId: id } as any);
      setValue(field as any, res, { shouldValidate: true, shouldDirty: true });
      setStatus("idle");
      setMsg("Upload successful");
    } catch (e: any) {
      setStatus("error");
      setMsg(e?.message || "Upload failed");
    }
  };

  const removeSide = async (side: "front" | "back") => {
    const value = side === "front" ? front : back;
    const setStatus = side === "front" ? setFrontStatus : setBackStatus;
    const setMsg = side === "front" ? setFrontMsg : setBackMsg;
    const field = side === "front" ? "fastCard.fastCardFrontPhoto" : "fastCard.fastCardBackPhoto";

    try {
      setStatus("deleting");
      setMsg("");
      if (value?.s3Key?.startsWith("temp-files/")) {
        await fetch("/api/v1/delete-temp-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: [value.s3Key] }),
        });
        setMsg("Photo removed");
      }
    } catch {
      setStatus("error");
      setMsg("Delete failed");
    } finally {
      setValue(field as any, undefined, { shouldValidate: true, shouldDirty: true });
      setStatus("idle");
    }
  };

  // Don’t mount this section for US applicants
  if (!mounted || !isCanadian) return null;

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white shadow-sm" data-field="fastCard">
      {/* ✅ Header with conditional Clear button */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800">{t("form.step2.page4.sections.fastCard.title", "FAST Card")}</h2>
      </div>

      {/* Disclaimer block with same style as other sections */}
      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <p className="text-sm text-gray-700 text-center">
          {t(
            "form.step2.page4.sections.fastCard.disclaimer",
            "This section is optional. However, if you provide any FAST Card information, you must complete all fields and upload both front and back photos."
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.fastNumber", "FAST Card Number")}</label>
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
          <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.fastExpiry", "Expiry Date")}</label>
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

        <div className="grid grid-cols-2 gap-6 md:col-span-1">
          {/* Front */}
          <div data-field="fastCard.fastCardFrontPhoto">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.step2.page4.fields.fastFront", "Photo Front")}</label>

            {front?.url ? (
              <div className="relative">
                <Image src={front.url} alt="FAST card front" width={400} height={128} className="w-full h-32 object-cover rounded-lg border border-gray-300" />
                <button
                  type="button"
                  onClick={() => removeSide("front")}
                  disabled={frontStatus === "uploading" || frontStatus === "deleting"}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center py-6 px-4 mt-1 w-full text-sm text-gray-600 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-400">
                <Camera className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-gray-400 text-xs">Upload Front</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadSide(e.target.files?.[0] || null, "front")} />
              </label>
            )}

            {frontStatus === "uploading" && <p className="text-yellow-600 text-xs mt-1">Uploading...</p>}
            {frontStatus === "error" && <p className="text-red-500 text-xs mt-1">{frontMsg}</p>}
            {frontStatus === "idle" && frontMsg && <p className="text-green-600 text-xs mt-1">{frontMsg}</p>}

            {/* show Zod error for front photo */}
            {fcErr.fastCardFrontPhoto?.message && (
              <p className="text-red-500 text-xs mt-1" role="alert">
                {fcErr.fastCardFrontPhoto.message}
              </p>
            )}
          </div>

          {/* Back */}
          <div data-field="fastCard.fastCardBackPhoto">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.step2.page4.fields.fastBack", "Photo Back")}</label>

            {back?.url ? (
              <div className="relative">
                <Image src={back.url} alt="FAST card back" width={400} height={128} className="w-full h-32 object-cover rounded-lg border border-gray-300" />
                <button
                  type="button"
                  onClick={() => removeSide("back")}
                  disabled={backStatus === "uploading" || backStatus === "deleting"}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center py-6 px-4 mt-1 w-full text-sm text-gray-600 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-400">
                <Camera className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-gray-400 text-xs">Upload Back</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadSide(e.target.files?.[0] || null, "back")} />
              </label>
            )}

            {backStatus === "uploading" && <p className="text-yellow-600 text-xs mt-1">Uploading...</p>}
            {backStatus === "error" && <p className="text-red-500 text-xs mt-1">{backMsg}</p>}
            {backStatus === "idle" && backMsg && <p className="text-green-600 text-xs mt-1">{backMsg}</p>}

            {/* show Zod error for back photo */}
            {fcErr.fastCardBackPhoto?.message && (
              <p className="text-red-500 text-xs mt-1" role="alert">
                {fcErr.fastCardBackPhoto.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* No banner here—schema now only emits granular FAST errors */}
    </section>
  );
}
