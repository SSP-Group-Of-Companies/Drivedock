/**
 * PlaceOfBirth.tsx
 *
 * Captures the driver's city, state/province, and country of birth.
 * Uses modular <TextInput /> with translations and validation errors.
 */

"use client";

import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

//components hooks and types imports
import useMounted from "@/hooks/useMounted";
import TextInput from "@/app/onboarding/components/TextInput";

interface PlaceOfBirthProps {
  disabled?: boolean;
}

export default function PlaceOfBirth({ disabled = false }: PlaceOfBirthProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const mounted = useMounted();
  const { t } = useTranslation("common");

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) return null;
  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <h2 className="text-center text-lg font-semibold text-gray-800">{t("form.step2.page1.sections.birth")}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TextInput name="birthCity" label={t("form.step2.page1.fields.birthCity")} placeholder="Waterloo" register={register} error={errors.birthCity} disabled={disabled} />

        <TextInput
          name="birthStateOrProvince"
          label={t("form.step2.page1.fields.birthStateOrProvince")}
          placeholder="Ontario"
          register={register}
          error={errors.birthStateOrProvince}
          disabled={disabled}
        />

        <TextInput name="birthCountry" label={t("form.step2.page1.fields.birthCountry")} placeholder="Canada" register={register} error={errors.birthCountry} disabled={disabled} />
      </div>
    </section>
  );
}
