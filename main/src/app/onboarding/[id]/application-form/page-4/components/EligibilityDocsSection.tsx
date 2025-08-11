"use client";

import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import useMounted from "@/hooks/useMounted";
import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { ApplicationFormPage4Schema } from "@/lib/zodSchemas/applicationFormPage4.Schema";
import { ECountryCode, IPhoto } from "@/types/shared.types";

type Props = {
  countryCode: ECountryCode;
};

function folderFor(kind: string) {
  const map: Record<string, any> = {
    health: (ES3Folder as any).HEALTH_CARD || "application/page4/health-card",
    medical: (ES3Folder as any).MED_CERT || "application/page4/medical-cert",
    passport: (ES3Folder as any).PASSPORT || "application/page4/passport",
    visa: (ES3Folder as any).US_VISA || "application/page4/us-visa",
    pr: (ES3Folder as any).PR_DOC || "application/page4/pr-permit",
  };
  return map[kind] ?? "application/page4";
}

function PhotoArray({
  field,
  label,
  folderKey,
}: {
  field: "healthCardPhotos" | "medicalCertificationPhotos" | "passportPhotos" | "usVisaPhotos" | "prPermitCitizenshipPhotos";
  label: string;
  folderKey: string;
}) {
  const mounted = useMounted();
  const { id } = useParams<{ id: string }>();
  const {
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<ApplicationFormPage4Schema>();

  if (!mounted) return null;

  const arr = (getValues(field) || []) as IPhoto[];
  const err = (errors as any)?.[field];

  const onUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const res = await uploadToS3Presigned({
        file,
        folder: folderFor(folderKey),
        trackerId: id,
      } as any);
      setValue(field, [...arr, res], { shouldValidate: true });
    } catch (e) {
      console.error("Upload failed:", e);
    }
  };

  const onRemove = async (idx: number) => {
    const s3Key = arr[idx]?.s3Key;
    if (s3Key?.startsWith("temp-files/")) {
      try {
        await fetch("/api/v1/delete-temp-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: [s3Key] }),
        });
      } catch {}
    }
    const next = [...arr];
    next.splice(idx, 1);
    setValue(field, next, { shouldValidate: true });
  };

  return (
    <div className="space-y-3" data-field={field}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700">
        <Upload className="w-4 h-4" />
        Add Photo
        <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0] || null)} />
      </label>

      {arr.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {arr.map((p, i) => (
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

export default function EligibilityDocsSection({ countryCode }: Props) {
  const { t } = useTranslation("common");
  const mounted = useMounted();
  if (!mounted) return null;

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white shadow-sm">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">{t("form.step2.page4.sections.docs.title", "Eligibility Documents")}</h2>
        <p className="text-sm text-gray-600">{t("form.step2.page4.sections.docs.subtitle", "Upload clear photos of the required documents.")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Canada-only required (frontend mirror) */}
        <PhotoArray field="healthCardPhotos" folderKey="health" label={t("form.step2.page4.fields.healthCard", "Health Card")} />

        {/* US-only required (frontend mirror) */}
        <PhotoArray field="medicalCertificationPhotos" folderKey="medical" label={t("form.step2.page4.fields.medCert", "Medical Certificate")} />

        {/* Both countries may use; US requires passport OR PR */}
        <PhotoArray field="passportPhotos" folderKey="passport" label={t("form.step2.page4.fields.passport", "Passport")} />

        <PhotoArray field="usVisaPhotos" folderKey="visa" label={t("form.step2.page4.fields.usVisa", "US Visa")} />

        <PhotoArray field="prPermitCitizenshipPhotos" folderKey="pr" label={t("form.step2.page4.fields.prPermit", "PR/Permit/Citizenship")} />
      </div>

      {/* Country hint */}
      <p className="text-xs text-gray-500">
        {countryCode === ECountryCode.CA
          ? t("form.step2.page4.hints.canada", "Canadian applicants must provide Health Card, Passport, US Visa and PR/Citizenship (existing uploads count).")
          : t("form.step2.page4.hints.us", "US drivers must provide a Medical Certificate and either Passport or PR/Citizenship (existing uploads count).")}
      </p>
    </section>
  );
}
