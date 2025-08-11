"use client";

import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import useMounted from "@/hooks/useMounted";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { ApplicationFormPage4Schema } from "@/lib/zodSchemas/applicationFormPage4.Schema";
import type { IPhoto } from "@/types/shared.types";

function targetFolder(key: string) {
  // Swap to your actual enum keys if you have them in ES3Folder.
  const m: Record<string, any> = {
    hst: (ES3Folder as any).HST || "application/page4/hst",
    incorporate: (ES3Folder as any).INCORPORATE || "application/page4/incorporate",
    banking: (ES3Folder as any).BANKING || "application/page4/banking",
  };
  return m[key] ?? "application/page4";
}

type PhotoListProps = {
  name: "hstPhotos" | "incorporatePhotos" | "bankingInfoPhotos";
  label: string;
  folderKey: "hst" | "incorporate" | "banking";
};

function PhotoList({ name, label, folderKey }: PhotoListProps) {
  const { t } = useTranslation("common");
  const mounted = useMounted();
  const { id } = useParams<{ id: string }>();
  const {
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<ApplicationFormPage4Schema>();

  if (!mounted) return null;

  const photos = (getValues(name) || []) as IPhoto[];
  const err = (errors as any)?.[name];

  const onUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const res = await uploadToS3Presigned({
        file,
        folder: targetFolder(folderKey),
        trackerId: id,
      } as any);
      setValue(name, [...photos, res], { shouldValidate: true });
    } catch (e) {
      console.error("Upload failed:", e);
      // You can toast here
    }
  };

  const onRemove = async (idx: number) => {
    const s3Key = photos[idx]?.s3Key;
    if (s3Key?.startsWith("temp-files/")) {
      try {
        await fetch("/api/v1/delete-temp-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: [s3Key] }),
        });
      } catch (e) {
        console.warn("Temp delete failed", e);
      }
    }
    const next = [...photos];
    next.splice(idx, 1);
    setValue(name, next, { shouldValidate: true });
  };

  return (
    <div className="space-y-3" data-field={name}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {/* Upload Button */}
      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700">
        <Upload className="w-4 h-4" />
        {t("actions.addPhoto", "Add Photo")}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0] || null)} />
      </label>

      {/* Thumbs */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {photos.map((p, i) => (
            <div key={`${p.s3Key}-${i}`} className="relative">
              <Image src={p.url} alt={`${label} ${i + 1}`} width={400} height={128} className="w-full h-32 object-cover rounded-lg border border-gray-300" />
              <button type="button" onClick={() => onRemove(i)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {err && typeof err.message === "string" && <p className="text-red-500 text-xs">{err.message}</p>}
    </div>
  );
}

export default function BusinessSection() {
  const { t } = useTranslation("common");
  const mounted = useMounted();
  const {
    register,
    formState: { errors },
  } = useFormContext<ApplicationFormPage4Schema>();

  if (!mounted) return null;

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white shadow-sm">
      <h2 className="text-center text-lg font-semibold text-gray-800">{t("form.step2.page4.sections.business.title", "Incorporate Details")}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.employeeNumber", "Employee Number")}</label>
          <input {...register("employeeNumber")} className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md" data-field="employeeNumber" />
          {errors.employeeNumber && <p className="text-red-500 text-xs mt-1">{errors.employeeNumber.message?.toString()}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.hstNumber", "HST Number")}</label>
          <input {...register("hstNumber")} className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md" data-field="hstNumber" />
          {errors.hstNumber && <p className="text-red-500 text-xs mt-1">{errors.hstNumber.message?.toString()}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.businessNumber", "Business Number")}</label>
          <input {...register("businessNumber")} className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md" data-field="businessNumber" />
          {errors.businessNumber && <p className="text-red-500 text-xs mt-1">{errors.businessNumber.message?.toString()}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PhotoList name="incorporatePhotos" label={t("form.step2.page4.fields.incorporatePhotos", "Incorporate Photos")} folderKey="incorporate" />
        <PhotoList name="hstPhotos" label={t("form.step2.page4.fields.hstPhotos", "HST Business Number Photos")} folderKey="hst" />
        <PhotoList name="bankingInfoPhotos" label={t("form.step2.page4.fields.bankingInfoPhotos", "Banking Info Photos")} folderKey="banking" />
      </div>

      {/* Root error for the all-or-nothing rule */}
      {(errors as any)?._errors?.length ? <p className="text-red-500 text-sm text-center">{(errors as any)?._errors[0]}</p> : null}
    </section>
  );
}
