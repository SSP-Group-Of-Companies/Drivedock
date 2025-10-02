"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import useMounted from "@/hooks/useMounted";
import Turnstile from "@/components/security/Turnsite";
import type { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";

export default function ApplicationFormTurnStileVerification() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  const {
    setValue,
    setError,
    clearErrors,
    formState: { errors },
    control,
    register,
  } = useFormContext<ApplicationFormPage1Schema>();

  const token = useWatch({ control, name: "turnStileVerificationToken" });
  const hiddenInputProps = register("turnStileVerificationToken");

  const handleToken = (tkn: string | null | undefined) => {
    const value = tkn ?? "";
    setValue("turnStileVerificationToken", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
    if (value) clearErrors("turnStileVerificationToken");
  };

  const handleExpire = () => {
    setValue("turnStileVerificationToken", "", {
      shouldValidate: true,
      shouldDirty: true,
    });
    setError("turnStileVerificationToken", {
      type: "manual",
      message: t("form.step2.page1.verification.errorExpired"),
    });
  };

  const handleError = (err?: unknown) => {
    setValue("turnStileVerificationToken", "", {
      shouldValidate: true,
      shouldDirty: true,
    });
    setError("turnStileVerificationToken", {
      type: "manual",
      message: t("form.step2.page1.verification.errorFailed"),
    });
    console.warn("Turnstile error:", err);
  };

  if (!mounted) return null;

  return (
    <section className="space-y-3 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <h2 className="text-center text-lg font-semibold text-gray-800">{t("form.step2.page1.verification.title")}</h2>

      {/* Keep field in RHF state */}
      <input type="hidden" data-field="turnStileVerificationToken" {...hiddenInputProps} />

      <div className="flex flex-col items-center gap-2">
        <Turnstile mode="managed" onToken={handleToken} onExpire={handleExpire} onError={handleError} />

        {/* Status line */}
        {token ? (
          <p className="text-sm text-green-600">{t("form.step2.page1.verification.statusVerified")}</p>
        ) : (
          <p className="text-sm text-gray-500">{t("form.step2.page1.verification.statusPrompt")}</p>
        )}
      </div>

      {/* RHF error */}
      {errors.turnStileVerificationToken && <p className="text-red-500 text-sm mt-1 text-center">{errors.turnStileVerificationToken.message?.toString()}</p>}
    </section>
  );
}
