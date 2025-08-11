"use client";

import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "next-i18next";
import useMounted from "@/hooks/useMounted";
import ContinueButton from "../../ContinueButton";
import { page4ConfigFactory } from "@/lib/frontendConfigs/applicationFormConfigs/page4Config";

interface Page4ClientProps {
  trackerId: string;
  initialData: any;
  trackerContext: any;
}

export default function Page4Client({
  trackerId,
  initialData,
}: Page4ClientProps) {
  const { t } = useTranslation("common");
  const mounted = useMounted();

  const methods = useForm({
    defaultValues: initialData || {},
  });

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t("form.step2.page4.title", "Application Form - Page 4")}
        </h1>
        <p className="text-gray-600">
          {t(
            "form.step2.page4.description",
            "Please complete the following information."
          )}
        </p>
      </div>

      <FormProvider {...methods}>
        <form
          className="space-y-8"
          onSubmit={(e) => e.preventDefault()}
          noValidate
        >
          {/* Placeholder content for Page 4 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t("form.step2.page4.section", "Page 4 Section")}
            </h2>
            <p className="text-gray-600">
              {t(
                "form.step2.page4.placeholder",
                "This is a placeholder for Page 4 content. Add your form fields here."
              )}
            </p>
          </div>

          <ContinueButton
            config={(ctx) =>
              page4ConfigFactory({
                ...ctx,
                effectiveTrackerId: trackerId,
              })
            }
            trackerId={trackerId}
          />
        </form>
      </FormProvider>
    </div>
  );
}
