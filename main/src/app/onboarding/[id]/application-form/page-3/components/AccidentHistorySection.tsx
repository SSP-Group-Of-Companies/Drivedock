"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useMemo, useState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ApplicationFormPage3Schema } from "@/lib/zodSchemas/applicationFormPage3.schema";
import useMounted from "@/hooks/useMounted";
import useIsDesktop from "@/hooks/useIsDesktop";

export default function AccidentHistorySection() {
  const {
    control,
    register,
    setValue,
    clearErrors,
    formState: { errors },
  } = useFormContext<ApplicationFormPage3Schema>();
  const { t } = useTranslation("common");
  const mounted = useMounted();
  const isDesktop = useIsDesktop();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "accidentHistory",
    keyName: "key",
  });

  const hasAccidentHistory = useWatch({ control, name: "hasAccidentHistory" });

  const initialMobileVisible = useMemo(() => {
    const anyData = (idx: number) => {
      const fh: any = (control as any)?._formValues?.accidentHistory?.[idx];
      return (
        !!fh?.date ||
        !!fh?.natureOfAccident ||
        typeof fh?.fatalities === "number" ||
        typeof fh?.injuries === "number"
      );
    };
    const count = fields.reduce((acc, _f, i) => (anyData(i) ? i + 1 : acc), 0);
    return Math.min(4, Math.max(1, count));
  }, [fields, control]);

  const [mobileVisibleCount, setMobileVisibleCount] =
    useState<number>(initialMobileVisible);

  const accidentHistory = useWatch({ control, name: "accidentHistory" });
  const clearedRowsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!accidentHistory) return;
    accidentHistory.forEach((accident, index) => {
      const allEmpty =
        !accident?.date?.trim() &&
        !accident?.natureOfAccident?.trim() &&
        (accident?.fatalities == null) &&
        (accident?.injuries == null);

      if (allEmpty && !clearedRowsRef.current.has(index)) {
        clearErrors([
          `accidentHistory.${index}.date`,
          `accidentHistory.${index}.natureOfAccident`,
          `accidentHistory.${index}.fatalities`,
          `accidentHistory.${index}.injuries`,
        ]);
        clearedRowsRef.current.add(index);
      } else if (!allEmpty) {
        clearedRowsRef.current.delete(index);
      }
    });
  }, [accidentHistory, clearErrors]);

  if (!mounted) return null;

  return (
    <section className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">
        {t("form.step2.page3.sections.accidentHistory")}
      </h2>
      <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        {t("form.step2.page3.instructionsAccidentHistory")}
      </p>

      {/* Boolean gate: Have you ever been involved in an accident? */}
      <div className="mb-4" data-field="hasAccidentHistory">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-800 text-center">{t("form.step2.page3.questions.hasAccidentHistory", "Have you ever been involved in an accident?")}</span>
          <div className="inline-flex rounded-full border border-gray-200 overflow-hidden">
          <button
            type="button"
            className={`px-4 py-1 text-sm ${hasAccidentHistory === true ? "bg-sky-600 text-white" : "bg-white text-gray-700"}`}
            onClick={() => {
              setValue("hasAccidentHistory", true, { shouldDirty: true, shouldValidate: true });
              clearErrors(["hasAccidentHistory", "accidentHistory"]);
              setMobileVisibleCount(1);
            }}
          >
            {t("form.step1.questions.yes", "Yes")}
          </button>
          <button
            type="button"
              className={`px-4 py-1 text-sm border-l border-gray-300 ${hasAccidentHistory === false ? "bg-sky-600 text-white" : "bg-white text-gray-700"}`}
            onClick={() => {
              setValue("hasAccidentHistory", false, { shouldDirty: true, shouldValidate: true });
              clearErrors(["hasAccidentHistory", "accidentHistory"]);
            }}
          >
            {t("form.step1.questions.no", "No")}
          </button>
          </div>
        </div>
      </div>

      {/* Root error messages */}
      {((errors as any)?.hasAccidentHistory?.message || (errors as any)?.accidentHistory?.message) && (
        <div className="mb-4 text-center text-sm text-red-600">
          {(errors as any)?.hasAccidentHistory?.message || (errors as any)?.accidentHistory?.message}
        </div>
      )}

      {hasAccidentHistory === true && (
        <div className="overflow-x-auto" data-field="accidentHistory">
          {isDesktop ? (
          /* ---------- DESKTOP TABLE (only rendered on desktop) ---------- */
          <table className="w-full text-sm border-collapse table">
            <thead>
              <tr className="bg-gray-50 rounded-md shadow-sm">
                <th className="py-3 px-4 text-left font-semibold text-gray-700 text-xs w-32">
                  {t("form.step2.page3.fields.date")}
                </th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700 text-xs w-full">
                  {t("form.step2.page3.fields.natureOfAccident")}
                </th>
                <th className="py-3 px-4 text-center font-semibold text-gray-700 text-xs w-16">
                  {t("form.step2.page3.fields.fatalities")}
                </th>
                <th className="py-3 px-4 text-center font-semibold text-gray-700 text-xs w-16">
                  {t("form.step2.page3.fields.injuries")}
                </th>
              </tr>
            </thead>
            <tbody>
              {fields.slice(0, 4).map((field, index) => (
                <tr
                  key={field.key}
                  className={`border-b border-gray-100 ${
                    index > 0 ? "bg-gray-25" : ""
                  }`}
                >
                  <td className="py-3 px-4">
                    <input
                      type="date"
                      className={`h-10 px-2 mt-1 text-center block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md border ${
                        (errors.accidentHistory as any)?.[index]?.date ? "border-red-500" : "border-gray-200"
                      }`}
                      placeholder="YYYY-MM-DD"
                      data-field={`accidentHistory.${index}.date`}
                      {...register(`accidentHistory.${index}.date` as const)}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      className={`py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md border ${
                        (errors.accidentHistory as any)?.[index]?.natureOfAccident ? "border-red-500" : "border-gray-200"
                      }`}
                      placeholder={
                        index === 0 ? "Rear-end collision on highway" : ""
                      }
                      data-field={`accidentHistory.${index}.natureOfAccident`}
                      {...register(
                        `accidentHistory.${index}.natureOfAccident` as const
                      )}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min={0}
                      className={`h-10 w-16 text-center p-0 rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border ${
                        (errors.accidentHistory as any)?.[index]?.fatalities ? "border-red-500" : "border-gray-200"
                      }`}
                      placeholder={index === 0 ? "0" : ""}
                      data-field={`accidentHistory.${index}.fatalities`}
                      {...register(
                        `accidentHistory.${index}.fatalities` as const,
                        { setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)) }
                      )}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min={0}
                      className={`h-10 w-16 text-center p-0 rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border ${
                        (errors.accidentHistory as any)?.[index]?.injuries ? "border-red-500" : "border-gray-200"
                      }`}
                      placeholder={index === 0 ? "0" : ""}
                      data-field={`accidentHistory.${index}.injuries`}
                      {...register(
                        `accidentHistory.${index}.injuries` as const,
                        { setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)) }
                      )}
                    />
                  </td>
                  {index > 0 && (
                    <td className="py-3 px-2 text-right">
                      <button
                        type="button"
                        aria-label={t("form.remove", "Remove")}
                        className="inline-flex items-center text-red-600 hover:text-red-700"
                        onClick={() => remove(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          ) : (
          /* ---------- MOBILE STACK (only rendered on mobile) ---------- */
          <div className="space-y-4">
            {fields.slice(0, mobileVisibleCount).map((field, index) => (
              <div
                key={field.key}
                className="relative grid grid-cols-1 gap-3 border border-gray-200 rounded-xl p-4 bg-white shadow-sm"
              >
                {index > 0 && (
                  <button
                    type="button"
                    aria-label={t("form.remove", "Remove")}
                    className="absolute top-2 right-2 text-red-600 hover:text-red-700"
                    onClick={() => {
                      remove(index);
                      setMobileVisibleCount((c) => Math.max(1, c - 1));
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t("form.step2.page3.fields.date")}
                  </label>
                  <input
                    type="date"
                    className={`py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md border ${
                      (errors.accidentHistory as any)?.[index]?.date ? "border-red-500" : "border-gray-200"
                    }`}
                    data-field={`accidentHistory.${index}.date`}
                    {...register(`accidentHistory.${index}.date` as const)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t("form.step2.page3.fields.natureOfAccident")}
                  </label>
                  <input
                    type="text"
                    className={`py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md border ${
                      (errors.accidentHistory as any)?.[index]?.natureOfAccident ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder={index === 0 ? "Rear-end collision on highway" : ""}
                    data-field={`accidentHistory.${index}.natureOfAccident`}
                    {...register(
                      `accidentHistory.${index}.natureOfAccident` as const
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t("form.step2.page3.fields.fatalities")}
                    </label>
                    <input
                      type="number"
                      min={0}
                      className={`w-full py-2 px-2 text-center rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border ${
                        (errors.accidentHistory as any)?.[index]?.fatalities ? "border-red-500" : "border-gray-200"
                      }`}
                      data-field={`accidentHistory.${index}.fatalities`}
                      {...register(
                        `accidentHistory.${index}.fatalities` as const,
                        { setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)) }
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t("form.step2.page3.fields.injuries")}
                    </label>
                    <input
                      type="number"
                      min={0}
                      className={`w-full py-2 px-2 text-center rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border ${
                        (errors.accidentHistory as any)?.[index]?.injuries ? "border-red-500" : "border-gray-200"
                      }`}
                      data-field={`accidentHistory.${index}.injuries`}
                      {...register(
                        `accidentHistory.${index}.injuries` as const,
                        { setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)) }
                      )}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-center">
              <button
                type="button"
                className={`mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm shadow ${
                  fields.length >= 4 ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-sky-600 text-white hover:opacity-90"
                }`}
                disabled={fields.length >= 4}
                onClick={() => {
                  const maxRows = 4;
                  if (fields.length < maxRows) {
                    append({
                      date: "",
                      natureOfAccident: "",
                    } as any);
                    setMobileVisibleCount((c) => Math.min(maxRows, c + 1));
                  }
                }}
              >
                {t("form.addMore", "Add another")}
              </button>
            </div>
          </div>
          )}

          {/* Desktop Add another */}
          {isDesktop && (
            <div className="flex justify-center mt-3">
              <button
                type="button"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm shadow ${
                  fields.length >= 4 ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-sky-600 text-white hover:opacity-90"
                }`}
                disabled={fields.length >= 4}
                onClick={() => {
                  const maxRows = 4;
                  if (fields.length < maxRows) {
                    append({ date: "", natureOfAccident: "" } as any);
                    setMobileVisibleCount((c) => Math.min(maxRows, c + 1));
                  }
                }}
              >
                {t("form.addMore", "Add another")}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
