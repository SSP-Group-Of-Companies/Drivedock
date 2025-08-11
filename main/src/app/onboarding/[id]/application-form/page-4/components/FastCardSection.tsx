"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "next/navigation";
import useMounted from "@/hooks/useMounted";
import Image from "next/image";
import { Camera, X } from "lucide-react";

import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { ApplicationFormPage4Schema } from "@/lib/zodSchemas/applicationFormPage4.Schema";
import type { IPhoto } from "@/types/shared.types";

export default function FastCardSection({ isCanadian }: { isCanadian: boolean }) {
  const mounted = useMounted();
  const { t } = useTranslation("common");
  const { id } = useParams<{ id: string }>();

  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<ApplicationFormPage4Schema>();

  const front = useWatch({ control, name: "fastCard.fastCardFrontPhoto" }) as IPhoto | undefined;
  const back = useWatch({ control, name: "fastCard.fastCardBackPhoto" }) as IPhoto | undefined;

  if (!mounted) return null;

  const uploadSide = async (file: File | null, side: "front" | "back") => {
    const field = side === "front" ? "fastCard.fastCardFrontPhoto" : "fastCard.fastCardBackPhoto";
    if (!file) {
      setValue(field as any, undefined, { shouldValidate: true });
      return;
    }
    const res = await uploadToS3Presigned({
      file,
      folder: (ES3Folder as any).FAST_CARD || "application/page4/fast-card",
      trackerId: id,
    } as any);
    setValue(field as any, res, { shouldValidate: true });
  };

  const removeSide = async (side: "front" | "back") => {
    const value = side === "front" ? front : back;
    if (value?.s3Key?.startsWith("temp-files/")) {
      try {
        await fetch("/api/v1/delete-temp-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: [value.s3Key] }),
        });
      } catch {}
    }
    setValue((side === "front" ? "fastCard.fastCardFrontPhoto" : "fastCard.fastCardBackPhoto") as any, undefined, { shouldValidate: true });
  };

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white shadow-sm">
      <h2 className="text-center text-lg font-semibold text-gray-800">{t("form.step2.page4.sections.fastCard.title", "Fast Card")}</h2>

      {!isCanadian && <p className="text-xs text-gray-500 text-center">{t("form.step2.page4.sections.fastCard.note", "FAST card is optional for US applicants.")}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.fastNumber", "Fast Card Number")}</label>
          <input {...register("fastCard.fastCardNumber")} className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500" data-field="fastCard.fastCardNumber" />
          {errors.fastCard?.fastCardNumber && <p className="text-red-500 text-xs mt-1">{errors.fastCard.fastCardNumber.message?.toString()}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.fastExpiry", "Expiry Date")}</label>
          <input type="date" {...register("fastCard.fastCardExpiry")} className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500" data-field="fastCard.fastCardExpiry" />
          {errors.fastCard?.fastCardExpiry && <p className="text-red-500 text-xs mt-1">{errors.fastCard.fastCardExpiry.message?.toString()}</p>}
        </div>

        <div className="grid grid-cols-2 gap-6 md:col-span-1">
          {/* Front */}
          <div data-field="fastCard.fastCardFrontPhoto">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.step2.page4.fields.fastFront", "Photo Front")}</label>
            {front?.url ? (
              <div className="relative">
                <Image src={front.url} alt="Fast card front" width={400} height={128} className="w-full h-32 object-cover rounded-lg border border-gray-300" />
                <button
                  type="button"
                  onClick={() => removeSide("front")}
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
          </div>

          {/* Back */}
          <div data-field="fastCard.fastCardBackPhoto">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.step2.page4.fields.fastBack", "Photo Back")}</label>
            {back?.url ? (
              <div className="relative">
                <Image src={back.url} alt="Fast card back" width={400} height={128} className="w-full h-32 object-cover rounded-lg border border-gray-300" />
                <button
                  type="button"
                  onClick={() => removeSide("back")}
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
          </div>
        </div>
      </div>

      {errors.fastCard && typeof (errors.fastCard as any).message === "string" && <p className="text-red-500 text-sm text-center">{(errors.fastCard as any).message}</p>}
    </section>
  );
}
