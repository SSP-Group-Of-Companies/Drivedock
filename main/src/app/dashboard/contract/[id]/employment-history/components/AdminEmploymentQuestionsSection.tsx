"use client";

import { useTranslation } from "react-i18next";
import { IApplicationFormPage2 } from "@/types/applicationForm.types";

interface AdminEmploymentQuestionsSectionProps {
  data: IApplicationFormPage2;
  isEditMode: boolean;
  staged: any;
  onStage: (changes: any) => void;
}

export default function AdminEmploymentQuestionsSection({ 
  data, 
  isEditMode, 
  staged, 
  onStage 
}: AdminEmploymentQuestionsSectionProps) {
  const { t } = useTranslation("common");

  // Helper function to get current value (staged or original)
  const getCurrentValue = (field: keyof IApplicationFormPage2) => {
    return staged[field] !== undefined ? staged[field] : data[field];
  };

  // Helper function to update a field
  const updateField = (field: keyof IApplicationFormPage2, value: any) => {
    onStage({ [field]: value });
  };

  // Helper function to update nested field in previousWorkDetails
  const updatePreviousWorkDetails = (field: keyof NonNullable<IApplicationFormPage2['previousWorkDetails']>, value: any) => {
    const currentDetails = getCurrentValue('previousWorkDetails') || {};
    const updatedDetails = { ...currentDetails, [field]: value };
    onStage({ previousWorkDetails: updatedDetails });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Section - Matching Employment History Style */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-3 pb-2 border-b"
          style={{ borderColor: "var(--color-outline-variant)" }}
        >
          <div
            className="w-2 h-8 rounded-full"
            style={{ background: "var(--color-info)" }}
          ></div>
          <h3
            className="text-xl font-bold"
            style={{ color: "var(--color-on-surface)" }}
          >
            Employment Questions
          </h3>
        </div>
      </div>

      <div className="space-y-6">
        {/* Employment Questions Card */}
        <div
          className="p-6 rounded-xl shadow-sm dark:shadow-none space-y-4 relative border"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-outline)",
          }}
        >
          {/* Card Header - Admin Style */}
          <div
            className="absolute -top-3 left-6 px-3"
            style={{ background: "var(--color-card)" }}
          >
            <h3
              className="text-sm font-bold"
              style={{ color: "var(--color-on-surface)" }}
            >
              Employment Questions
            </h3>
          </div>

          <div className="space-y-6">
            {/* Have you ever worked with this company before? */}
            <div className="space-y-2">
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                {t("form.step2.page2.questions.workedWithCompanyBefore")}
              </label>
              {isEditMode ? (
                <div className="space-y-1">
                  <select
                    value={getCurrentValue('workedWithCompanyBefore') === true ? 'true' : getCurrentValue('workedWithCompanyBefore') === false ? 'false' : ''}
                    onChange={(e) => updateField('workedWithCompanyBefore', e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined)}
                    className="py-2 px-3 mt-1 block w-full rounded-md border text-sm transition-colors focus:outline-none focus:shadow-md"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-outline)",
                      color: "var(--color-on-surface)",
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              ) : (
                <div
                  className="py-2 px-3 rounded-md border text-sm"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                >
                  {getCurrentValue('workedWithCompanyBefore') === true ? "Yes" : getCurrentValue('workedWithCompanyBefore') === false ? "No" : "Not specified"}
                </div>
              )}
            </div>

            {/* Conditional fields when workedWithCompanyBefore is true */}
            {getCurrentValue('workedWithCompanyBefore') === true && (
              <div className="space-y-6 pl-4 border-l-2" style={{ borderColor: "var(--color-info)" }}>
                {/* Reason for leaving company */}
                <div className="space-y-2">
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    {t("form.step2.page2.questions.reasonForLeavingCompany")}
                  </label>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <textarea
                        value={getCurrentValue('reasonForLeavingCompany') || ''}
                        onChange={(e) => updateField('reasonForLeavingCompany', e.target.value)}
                        className="py-2 px-3 mt-1 block w-full rounded-md border text-sm transition-colors focus:outline-none focus:shadow-md"
                        style={{
                          background: "var(--color-surface)",
                          borderColor: "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        rows={3}
                        placeholder="Please explain your reason for leaving..."
                      />
                    </div>
                  ) : (
                    <div
                      className="py-2 px-3 rounded-md border text-sm"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                    >
                      {getCurrentValue('reasonForLeavingCompany') || "Not specified"}
                    </div>
                  )}
                </div>

                {/* Previous work details */}
                <div className="space-y-4">
                  <h4
                    className="text-sm font-medium"
                    style={{ color: "var(--color-on-surface)" }}
                  >
                    Previous Work Details
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* From Date */}
                    <div className="space-y-2">
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        {t("form.step2.page2.fields.previousWorkFrom")}
                      </label>
                      {isEditMode ? (
                        <div className="space-y-1">
                          <input
                            type="date"
                            value={getCurrentValue('previousWorkDetails')?.from ? new Date(getCurrentValue('previousWorkDetails').from).toISOString().split('T')[0] : ''}
                            onChange={(e) => updatePreviousWorkDetails('from', e.target.value)}
                            className="py-2 px-3 mt-1 block w-full rounded-md border text-sm transition-colors focus:outline-none focus:shadow-md"
                            style={{
                              background: "var(--color-surface)",
                              borderColor: "var(--color-outline)",
                              color: "var(--color-on-surface)",
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className="py-2 px-3 rounded-md border text-sm"
                          style={{
                            background: "var(--color-surface)",
                            borderColor: "var(--color-outline)",
                            color: "var(--color-on-surface)",
                          }}
                        >
                          {getCurrentValue('previousWorkDetails')?.from ? new Date(getCurrentValue('previousWorkDetails').from).toLocaleDateString() : "Not specified"}
                        </div>
                      )}
                    </div>

                    {/* To Date */}
                    <div className="space-y-2">
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        {t("form.step2.page2.fields.previousWorkTo")}
                      </label>
                      {isEditMode ? (
                        <div className="space-y-1">
                          <input
                            type="date"
                            value={getCurrentValue('previousWorkDetails')?.to ? new Date(getCurrentValue('previousWorkDetails').to).toISOString().split('T')[0] : ''}
                            onChange={(e) => updatePreviousWorkDetails('to', e.target.value)}
                            className="py-2 px-3 mt-1 block w-full rounded-md border text-sm transition-colors focus:outline-none focus:shadow-md"
                            style={{
                              background: "var(--color-surface)",
                              borderColor: "var(--color-outline)",
                              color: "var(--color-on-surface)",
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className="py-2 px-3 rounded-md border text-sm"
                          style={{
                            background: "var(--color-surface)",
                            borderColor: "var(--color-outline)",
                            color: "var(--color-on-surface)",
                          }}
                        >
                          {getCurrentValue('previousWorkDetails')?.to ? new Date(getCurrentValue('previousWorkDetails').to).toLocaleDateString() : "Not specified"}
                        </div>
                      )}
                    </div>

                    {/* Rate of Pay */}
                    <div className="space-y-2">
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        {t("form.step2.page2.fields.previousWorkRateOfPay")}
                      </label>
                      {isEditMode ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={getCurrentValue('previousWorkDetails')?.rateOfPay || ''}
                            onChange={(e) => updatePreviousWorkDetails('rateOfPay', e.target.value)}
                            className="py-2 px-3 mt-1 block w-full rounded-md border text-sm transition-colors focus:outline-none focus:shadow-md"
                            style={{
                              background: "var(--color-surface)",
                              borderColor: "var(--color-outline)",
                              color: "var(--color-on-surface)",
                            }}
                            placeholder="e.g., $25/hour, $50,000/year"
                          />
                        </div>
                      ) : (
                        <div
                          className="py-2 px-3 rounded-md border text-sm"
                          style={{
                            background: "var(--color-surface)",
                            borderColor: "var(--color-outline)",
                            color: "var(--color-on-surface)",
                          }}
                        >
                          {getCurrentValue('previousWorkDetails')?.rateOfPay || "Not specified"}
                        </div>
                      )}
                    </div>

                    {/* Position */}
                    <div className="space-y-2">
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        {t("form.step2.page2.fields.previousWorkPosition")}
                      </label>
                      {isEditMode ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={getCurrentValue('previousWorkDetails')?.position || ''}
                            onChange={(e) => updatePreviousWorkDetails('position', e.target.value)}
                            className="py-2 px-3 mt-1 block w-full rounded-md border text-sm transition-colors focus:outline-none focus:shadow-md"
                            style={{
                              background: "var(--color-surface)",
                              borderColor: "var(--color-outline)",
                              color: "var(--color-on-surface)",
                            }}
                            placeholder="e.g., Driver, Dispatcher"
                          />
                        </div>
                      ) : (
                        <div
                          className="py-2 px-3 rounded-md border text-sm"
                          style={{
                            background: "var(--color-surface)",
                            borderColor: "var(--color-outline)",
                            color: "var(--color-on-surface)",
                          }}
                        >
                          {getCurrentValue('previousWorkDetails')?.position || "Not specified"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Are you currently employed? */}
            <div className="space-y-2">
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                {t("form.step2.page2.questions.currentlyEmployed")}
              </label>
              {isEditMode ? (
                <div className="space-y-1">
                  <select
                    value={getCurrentValue('currentlyEmployed') === true ? 'true' : getCurrentValue('currentlyEmployed') === false ? 'false' : ''}
                    onChange={(e) => updateField('currentlyEmployed', e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined)}
                    className="py-2 px-3 mt-1 block w-full rounded-md border text-sm transition-colors focus:outline-none focus:shadow-md"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-outline)",
                      color: "var(--color-on-surface)",
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              ) : (
                <div
                  className="py-2 px-3 rounded-md border text-sm"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                >
                  {getCurrentValue('currentlyEmployed') === true ? "Yes" : getCurrentValue('currentlyEmployed') === false ? "No" : "Not specified"}
                </div>
              )}
            </div>

            {/* Who referred you to us? */}
            <div className="space-y-2">
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                {t("form.step2.page2.questions.referredBy")}
              </label>
              {isEditMode ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={getCurrentValue('referredBy') || ''}
                    onChange={(e) => updateField('referredBy', e.target.value)}
                    className="py-2 px-3 mt-1 block w-full rounded-md border text-sm transition-colors focus:outline-none focus:shadow-md"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-outline)",
                      color: "var(--color-on-surface)",
                    }}
                    placeholder="e.g., Employee name, friend, advertisement"
                  />
                </div>
              ) : (
                <div
                  className="py-2 px-3 rounded-md border text-sm"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                >
                  {getCurrentValue('referredBy') || "Not specified"}
                </div>
              )}
            </div>

            {/* Expected rate of pay */}
            <div className="space-y-2">
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                {t("form.step2.page2.questions.expectedRateOfPay")}
              </label>
              {isEditMode ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={getCurrentValue('expectedRateOfPay') || ''}
                    onChange={(e) => updateField('expectedRateOfPay', e.target.value)}
                    className="py-2 px-3 mt-1 block w-full rounded-md border text-sm transition-colors focus:outline-none focus:shadow-md"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-outline)",
                      color: "var(--color-on-surface)",
                    }}
                    placeholder="e.g., $25/hour, $50,000/year"
                  />
                </div>
              ) : (
                <div
                  className="py-2 px-3 rounded-md border text-sm"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                >
                  {getCurrentValue('expectedRateOfPay') || "Not specified"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
