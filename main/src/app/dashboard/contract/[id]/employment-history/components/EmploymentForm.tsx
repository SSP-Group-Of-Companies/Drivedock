"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, AlertCircle, Info, Check } from "lucide-react";
import { formatInputDate } from "@/lib/utils/dateUtils";
import {
  validateEmployments,
  type EmploymentValidationError,
} from "@/app/api/v1/admin/onboarding/[id]/application-form/employment-history/employmentValidation";
import { IEmploymentEntry } from "@/types/applicationForm.types";
import {
  calculateTimelineFromCurrent,
  getEmploymentGaps,
} from "@/lib/frontendConfigs/applicationFormConfigs/validateEmploymentHistory";
import AdminGapBlock from "./AdminGapBlock";

interface EmploymentFormProps {
  data: {
    employments: IEmploymentEntry[];
  };
  isEditMode: boolean;
  staged: any;
  onStage: (changes: any) => void;
}

export default function EmploymentForm({
  data,
  isEditMode,
  staged,
  onStage,
}: EmploymentFormProps) {
  // Use staged employments if available, otherwise use original data
  const employments = useMemo(
    () => staged.employments || data.employments || [],
    [staged.employments, data.employments]
  );

  // Calculate timeline and gaps for proper gap display (same logic as onboarding)
  const { timeline } = useMemo(() => {
    return calculateTimelineFromCurrent(employments);
  }, [employments]);

  const gaps = useMemo(() => {
    return getEmploymentGaps(timeline);
  }, [timeline]);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<
    EmploymentValidationError[]
  >([]);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const addEmployment = () => {
    const newEmployment: IEmploymentEntry = {
      employerName: "",
      supervisorName: "",
      address: "",
      postalCode: "",
      city: "",
      stateOrProvince: "",
      phone1: "",
      phone2: "",
      email: "",
      positionHeld: "",
      from: "",
      to: "",
      salary: "",
      reasonForLeaving: "",
      subjectToFMCSR: false,
      safetySensitiveFunction: false,
      gapExplanationBefore: "",
    };

    const newEmployments = [...employments, newEmployment];
    onStage({ employments: newEmployments });
  };

  const removeEmployment = (index: number) => {
    // Never allow removing the current employer (index 0)
    if (employments.length > 1 && index > 0) {
      const newEmployments = employments.filter(
        (_: IEmploymentEntry, i: number) => i !== index
      );
      onStage({ employments: newEmployments });
    }
  };

  const updateEmployment = (
    index: number,
    field: keyof IEmploymentEntry,
    value: any
  ) => {
    const newEmployments = [...employments];
    newEmployments[index] = { ...newEmployments[index], [field]: value };
    onStage({ employments: newEmployments });
  };

  const updateGapExplanation = (gapIndex: number, explanation: string) => {
    // Gap explanation is stored in the employment entry that comes AFTER the gap
    // gapIndex refers to the employment index that has the gap before it
    const newEmployments = [...employments];
    if (newEmployments[gapIndex]) {
      newEmployments[gapIndex] = {
        ...newEmployments[gapIndex],
        gapExplanationBefore: explanation,
      };
      onStage({ employments: newEmployments });
    }
  };

  // Validate employments whenever they change
  useEffect(() => {
    if (isEditMode && employments.length > 0) {
      const errors = validateEmployments(employments);
      setValidationErrors(errors);
      setShowValidationErrors(errors.length > 0);
    } else {
      setValidationErrors([]);
      setShowValidationErrors(false);
    }
  }, [employments, isEditMode]);

  // Get field-specific errors for an employment
  const getFieldErrors = (
    employmentIndex: number,
    field: string
  ): EmploymentValidationError[] => {
    return validationErrors.filter(
      (error) =>
        error.employmentIndex === employmentIndex && error.field === field
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Section - Matching Personal Details Style */}
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
            Employment History
          </h3>
        </div>

        {/* Add Employment Button - Right Aligned */}
        {isEditMode && (
          <button
            type="button"
            onClick={addEmployment}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-on-primary)",
            }}
          >
            <Plus className="w-4 h-4" />
            Add Employment
          </button>
        )}
      </div>

      {/* Validation Errors Display */}
      {showValidationErrors && validationErrors.length > 0 && (
        <div
          className="p-4 rounded-lg border"
          style={{
            background: "var(--color-error-container)",
            borderColor: "var(--color-error)",
          }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="w-5 h-5 mt-0.5 flex-shrink-0"
              style={{ color: "var(--color-error)" }}
            />
            <div className="space-y-2">
              <h4
                className="font-medium"
                style={{ color: "var(--color-error)" }}
              >
                Employment Validation Errors
              </h4>
              <ul className="space-y-1">
                {validationErrors.map((error, index) => (
                  <li
                    key={index}
                    className="text-sm"
                    style={{ color: "var(--color-error)" }}
                  >
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {employments.map((employment: IEmploymentEntry, index: number) => {
          const blocks = [];

          // Add the employment card
          blocks.push(
            <div
              key={index}
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
                  {index === 0 ? "Current Employer" : `Previous Employer`}
                </h3>
              </div>

              {/* Remove Button - Only show for previous employers (not current employer at index 0) */}
              {isEditMode && employments.length > 1 && index > 0 && (
                <button
                  type="button"
                  onClick={() => removeEmployment(index)}
                  className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors shadow-md"
                  style={{
                    background: "var(--color-error)",
                    color: "white",
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employer Name */}
                <div className="space-y-2">
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Employer Name
                  </label>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={
                          staged.employments?.[index]?.employerName ||
                          employment.employerName ||
                          ""
                        }
                        onChange={(e) =>
                          updateEmployment(
                            index,
                            "employerName",
                            e.target.value
                          )
                        }
                        className="py-2 px-3 mt-1 block w-full rounded-md border text-sm transition-colors focus:outline-none focus:shadow-md"
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "employerName").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="Enter employer name"
                      />
                      {getFieldErrors(index, "employerName").map(
                        (error, errorIndex) => (
                          <p
                            key={errorIndex}
                            className="text-xs"
                            style={{ color: "var(--color-error)" }}
                          >
                            {error.message}
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.employerName || "Not provided"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Supervisor Name */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Supervisor Name *
                  </label>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={
                          staged.employments?.[index]?.supervisorName ||
                          employment.supervisorName ||
                          ""
                        }
                        onChange={(e) =>
                          updateEmployment(
                            index,
                            "supervisorName",
                            e.target.value
                          )
                        }
                        className={`w-full p-3 rounded-lg border text-sm transition-colors ${
                          getFieldErrors(index, "supervisorName").length > 0
                            ? "border-red-500"
                            : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "supervisorName").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="Enter supervisor name"
                      />
                      {getFieldErrors(index, "supervisorName").map(
                        (error, errorIndex) => (
                          <p
                            key={errorIndex}
                            className="text-xs"
                            style={{ color: "var(--color-error)" }}
                          >
                            {error.message}
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.supervisorName || "Not provided"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Address *
                  </label>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={
                          staged.employments?.[index]?.address ||
                          employment.address ||
                          ""
                        }
                        onChange={(e) =>
                          updateEmployment(index, "address", e.target.value)
                        }
                        className={`w-full p-3 rounded-lg border text-sm transition-colors ${
                          getFieldErrors(index, "address").length > 0
                            ? "border-red-500"
                            : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "address").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="Enter street address"
                      />
                      {getFieldErrors(index, "address").map(
                        (error, errorIndex) => (
                          <p
                            key={errorIndex}
                            className="text-xs"
                            style={{ color: "var(--color-error)" }}
                          >
                            {error.message}
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.address || "Not provided"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Postal Code */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Postal Code/Zip *
                  </label>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={
                          staged.employments?.[index]?.postalCode ||
                          employment.postalCode ||
                          ""
                        }
                        onChange={(e) =>
                          updateEmployment(index, "postalCode", e.target.value)
                        }
                        className={`w-full p-3 rounded-lg border text-sm transition-colors ${
                          getFieldErrors(index, "postalCode").length > 0
                            ? "border-red-500"
                            : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "postalCode").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="Enter postal code"
                      />
                      {getFieldErrors(index, "postalCode").map(
                        (error, errorIndex) => (
                          <p
                            key={errorIndex}
                            className="text-xs"
                            style={{ color: "var(--color-error)" }}
                          >
                            {error.message}
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.postalCode || "Not provided"}
                      </span>
                    </div>
                  )}
                </div>

                {/* City */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    City *
                  </label>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={
                          staged.employments?.[index]?.city ||
                          employment.city ||
                          ""
                        }
                        onChange={(e) =>
                          updateEmployment(index, "city", e.target.value)
                        }
                        className={`w-full p-3 rounded-lg border text-sm transition-colors ${
                          getFieldErrors(index, "city").length > 0
                            ? "border-red-500"
                            : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "city").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="Enter city"
                      />
                      {getFieldErrors(index, "city").map(
                        (error, errorIndex) => (
                          <p
                            key={errorIndex}
                            className="text-xs"
                            style={{ color: "var(--color-error)" }}
                          >
                            {error.message}
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.city || "Not provided"}
                      </span>
                    </div>
                  )}
                </div>

                {/* State/Province */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    State/Province *
                  </label>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={
                          staged.employments?.[index]?.stateOrProvince ||
                          employment.stateOrProvince ||
                          ""
                        }
                        onChange={(e) =>
                          updateEmployment(
                            index,
                            "stateOrProvince",
                            e.target.value
                          )
                        }
                        className={`w-full p-3 rounded-lg border text-sm transition-colors ${
                          getFieldErrors(index, "stateOrProvince").length > 0
                            ? "border-red-500"
                            : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "stateOrProvince").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="Enter state or province"
                      />
                      {getFieldErrors(index, "stateOrProvince").map(
                        (error, errorIndex) => (
                          <p
                            key={errorIndex}
                            className="text-xs"
                            style={{ color: "var(--color-error)" }}
                          >
                            {error.message}
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.stateOrProvince || "Not provided"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Phone 1 */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Phone 1 *
                  </label>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="tel"
                        value={
                          staged.employments?.[index]?.phone1 ||
                          employment.phone1 ||
                          ""
                        }
                        onChange={(e) =>
                          updateEmployment(index, "phone1", e.target.value)
                        }
                        className={`w-full p-3 rounded-lg border text-sm transition-colors ${
                          getFieldErrors(index, "phone1").length > 0
                            ? "border-red-500"
                            : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "phone1").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="Enter primary phone number"
                      />
                      {getFieldErrors(index, "phone1").map(
                        (error, errorIndex) => (
                          <p
                            key={errorIndex}
                            className="text-xs"
                            style={{ color: "var(--color-error)" }}
                          >
                            {error.message}
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.phone1 || "Not provided"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Phone 2 (Optional) */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Phone 2 (Optional)
                  </label>
                  {isEditMode ? (
                    <input
                      type="tel"
                      value={
                        staged.employments?.[index]?.phone2 ||
                        employment.phone2 ||
                        ""
                      }
                      onChange={(e) =>
                        updateEmployment(index, "phone2", e.target.value)
                      }
                      className="w-full p-3 rounded-lg border text-sm transition-colors"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                      placeholder="Enter secondary phone number"
                    />
                  ) : (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.phone2 || "Not provided"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Email *
                  </label>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="email"
                        value={
                          staged.employments?.[index]?.email ||
                          employment.email ||
                          ""
                        }
                        onChange={(e) =>
                          updateEmployment(index, "email", e.target.value)
                        }
                        className={`w-full p-3 rounded-lg border text-sm transition-colors ${
                          getFieldErrors(index, "email").length > 0
                            ? "border-red-500"
                            : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "email").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="Enter email address"
                      />
                      {getFieldErrors(index, "email").map(
                        (error, errorIndex) => (
                          <p
                            key={errorIndex}
                            className="text-xs"
                            style={{ color: "var(--color-error)" }}
                          >
                            {error.message}
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.email || "Not provided"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Position Held */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Position Held *
                  </label>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={
                          staged.employments?.[index]?.positionHeld ||
                          employment.positionHeld ||
                          ""
                        }
                        onChange={(e) =>
                          updateEmployment(
                            index,
                            "positionHeld",
                            e.target.value
                          )
                        }
                        className={`w-full p-3 rounded-lg border text-sm transition-colors ${
                          getFieldErrors(index, "positionHeld").length > 0
                            ? "border-red-500"
                            : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "positionHeld").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="Enter position held"
                      />
                      {getFieldErrors(index, "positionHeld").map(
                        (error, errorIndex) => (
                          <p
                            key={errorIndex}
                            className="text-xs"
                            style={{ color: "var(--color-error)" }}
                          >
                            {error.message}
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.positionHeld || "Not provided"}
                      </span>
                    </div>
                  )}
                </div>

                {/* From Date */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    From Date *
                  </label>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="date"
                        value={
                          formatInputDate(
                            staged.employments?.[index]?.from || employment.from
                          ) || ""
                        }
                        onChange={(e) =>
                          updateEmployment(index, "from", e.target.value)
                        }
                        className={`w-full p-3 rounded-lg border text-sm transition-colors ${
                          getFieldErrors(index, "from").length > 0
                            ? "border-red-500"
                            : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "from").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                      />
                      {getFieldErrors(index, "from").map(
                        (error, errorIndex) => (
                          <p
                            key={errorIndex}
                            className="text-xs"
                            style={{ color: "var(--color-error)" }}
                          >
                            {error.message}
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.from
                          ? formatDate(employment.from)
                          : "Not provided"}
                      </span>
                    </div>
                  )}
                </div>

                {/* To Date */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    To Date *
                  </label>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="date"
                        value={
                          formatInputDate(
                            staged.employments?.[index]?.to || employment.to
                          ) || ""
                        }
                        onChange={(e) =>
                          updateEmployment(index, "to", e.target.value)
                        }
                        className={`w-full p-3 rounded-lg border text-sm transition-colors ${
                          getFieldErrors(index, "to").length > 0
                            ? "border-red-500"
                            : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "to").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                      />
                      {getFieldErrors(index, "to").map((error, errorIndex) => (
                        <p
                          key={errorIndex}
                          className="text-xs"
                          style={{ color: "var(--color-error)" }}
                        >
                          {error.message}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.to
                          ? formatDate(employment.to)
                          : "Not provided"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Salary */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Salary *
                  </label>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={
                          staged.employments?.[index]?.salary ||
                          employment.salary ||
                          ""
                        }
                        onChange={(e) =>
                          updateEmployment(index, "salary", e.target.value)
                        }
                        className={`w-full p-3 rounded-lg border text-sm transition-colors ${
                          getFieldErrors(index, "salary").length > 0
                            ? "border-red-500"
                            : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "salary").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="$0.50/mile or $25/hr"
                      />
                      {getFieldErrors(index, "salary").map(
                        (error, errorIndex) => (
                          <p
                            key={errorIndex}
                            className="text-xs"
                            style={{ color: "var(--color-error)" }}
                          >
                            {error.message}
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.salary
                          ? String(employment.salary)
                          : "Not provided"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Reason For Leaving */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Reason For Leaving *
                  </label>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={
                          staged.employments?.[index]?.reasonForLeaving ||
                          employment.reasonForLeaving ||
                          ""
                        }
                        onChange={(e) =>
                          updateEmployment(
                            index,
                            "reasonForLeaving",
                            e.target.value
                          )
                        }
                        className={`w-full p-3 rounded-lg border text-sm transition-colors ${
                          getFieldErrors(index, "reasonForLeaving").length > 0
                            ? "border-red-500"
                            : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "reasonForLeaving").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="Enter reason for leaving"
                      />
                      {getFieldErrors(index, "reasonForLeaving").map(
                        (error, errorIndex) => (
                          <p
                            key={errorIndex}
                            className="text-xs"
                            style={{ color: "var(--color-error)" }}
                          >
                            {error.message}
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.reasonForLeaving || "Not provided"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* FMCSR and Safety Sensitive Questions - Admin Style */}
              <div className="mt-6 space-y-4">
                {/* Subject to FMCSR */}
                <div
                  className="flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:shadow-sm"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                  }}
                >
                  <span
                    className="text-sm flex-1 pr-4"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Were you subject to the FMCSR (Federal Motor Carrier Safety
                    Regulations)?
                  </span>
                  {isEditMode ? (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`fmcsr-${index}`}
                          value="true"
                          checked={
                            staged.employments?.[index]?.subjectToFMCSR ===
                              true || employment.subjectToFMCSR === true
                          }
                          onChange={() =>
                            updateEmployment(index, "subjectToFMCSR", true)
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`fmcsr-${index}`}
                          value="false"
                          checked={
                            staged.employments?.[index]?.subjectToFMCSR ===
                              false || employment.subjectToFMCSR === false
                          }
                          onChange={() =>
                            updateEmployment(index, "subjectToFMCSR", false)
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm">No</span>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center justify-center w-6 h-6 rounded border-2"
                        style={{
                          borderColor:
                            employment.subjectToFMCSR === true
                              ? "var(--color-success)"
                              : "var(--color-error)",
                          background:
                            employment.subjectToFMCSR === true
                              ? "var(--color-success)"
                              : "var(--color-error)",
                        }}
                      >
                        {employment.subjectToFMCSR === true && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                        {employment.subjectToFMCSR === false && (
                          <span className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <span
                        className="text-sm font-medium min-w-[40px]"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.subjectToFMCSR === true
                          ? "Yes"
                          : employment.subjectToFMCSR === false
                          ? "No"
                          : "Not specified"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Safety Sensitive Function */}
                <div
                  className="flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:shadow-sm"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 pr-4">
                    <span
                      className="text-sm"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      Was your job designated as a safety sensitive function in
                      any DOT regulated mode subject to the drug and alcohol
                      testing requirement of 49 CFR part 40?
                    </span>
                    <Info
                      className="w-4 h-4"
                      style={{ color: "var(--color-info)" }}
                    />
                  </div>
                  {isEditMode ? (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`safety-${index}`}
                          value="true"
                          checked={
                            staged.employments?.[index]
                              ?.safetySensitiveFunction === true ||
                            employment.safetySensitiveFunction === true
                          }
                          onChange={() =>
                            updateEmployment(
                              index,
                              "safetySensitiveFunction",
                              true
                            )
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`safety-${index}`}
                          value="false"
                          checked={
                            staged.employments?.[index]
                              ?.safetySensitiveFunction === false ||
                            employment.safetySensitiveFunction === false
                          }
                          onChange={() =>
                            updateEmployment(
                              index,
                              "safetySensitiveFunction",
                              false
                            )
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm">No</span>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center justify-center w-6 h-6 rounded border-2"
                        style={{
                          borderColor:
                            employment.safetySensitiveFunction === true
                              ? "var(--color-success)"
                              : "var(--color-error)",
                          background:
                            employment.safetySensitiveFunction === true
                              ? "var(--color-success)"
                              : "var(--color-error)",
                        }}
                      >
                        {employment.safetySensitiveFunction === true && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                        {employment.safetySensitiveFunction === false && (
                          <span className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <span
                        className="text-sm font-medium min-w-[40px]"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {employment.safetySensitiveFunction === true
                          ? "Yes"
                          : employment.safetySensitiveFunction === false
                          ? "No"
                          : "Not specified"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Display validation errors for boolean fields */}
                {isEditMode && (
                  <>
                    {getFieldErrors(index, "subjectToFMCSR").map(
                      (error, errorIndex) => (
                        <p
                          key={`fmcsr-error-${errorIndex}`}
                          className="text-xs ml-4"
                          style={{ color: "var(--color-error)" }}
                        >
                          • {error.message}
                        </p>
                      )
                    )}
                    {getFieldErrors(index, "safetySensitiveFunction").map(
                      (error, errorIndex) => (
                        <p
                          key={`safety-error-${errorIndex}`}
                          className="text-xs ml-4"
                          style={{ color: "var(--color-error)" }}
                        >
                          • {error.message}
                        </p>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          );

          // Check for gaps after this employment entry (same logic as onboarding)
          const gapAfter = gaps.find((gap) => gap.index === index);
          if (gapAfter) {
            blocks.push(
              <AdminGapBlock
                key={`gap-after-${index}`}
                index={gapAfter.index} // This is the employment that must explain the gap
                days={gapAfter.days}
                gapExplanation={
                  employments[gapAfter.index]?.gapExplanationBefore || ""
                }
                isEditMode={isEditMode}
                onUpdate={(explanation) =>
                  updateGapExplanation(gapAfter.index, explanation)
                }
              />
            );
          }

          return <div key={`employment-block-${index}`}>{blocks}</div>;
        })}
      </div>
    </div>
  );
}
