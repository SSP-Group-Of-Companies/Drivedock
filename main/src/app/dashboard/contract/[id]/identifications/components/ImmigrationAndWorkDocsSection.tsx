"use client";

import React from "react";
import { FileBadge2 } from "lucide-react";
import {
  EImmigrationStatusUS,
  IPassportDetails,
  IPrPermitDetails,
  EPrPermitDocumentType,
} from "@/types/applicationForm.types";
import { useEditMode } from "../../components/EditModeContext";

interface ImmigrationAndWorkDocsSectionProps {
  immigrationStatusInUS?: EImmigrationStatusUS;
  passportDetails?: IPassportDetails;
  prPermitCitizenshipDetails?: IPrPermitDetails;
  passportPhotosCount: number;
  prPermitCitizenshipPhotosCount: number;
  onStage: (changes: any) => void;
}

function normalizeDateForInput(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  if (typeof value === "string") {
    // Handle "2027-03-15T00:00:00.000Z" or already "2027-03-15"
    if (value.length >= 10) return value.slice(0, 10);
    return value;
  }
  return "";
}

export default function ImmigrationAndWorkDocsSection({
  immigrationStatusInUS,
  passportDetails,
  prPermitCitizenshipDetails,
  passportPhotosCount,
  prPermitCitizenshipPhotosCount,
  onStage,
}: ImmigrationAndWorkDocsSectionProps) {
  const { isEditMode } = useEditMode();

  // ---------- bundle selection ----------
  const hasPassportBundle =
    passportPhotosCount > 0 || !!passportDetails?.documentNumber;
  const hasPrBundle =
    prPermitCitizenshipPhotosCount > 0 ||
    !!prPermitCitizenshipDetails?.documentNumber;

  const initialSelection: "passport" | "pr" | null = hasPassportBundle
    ? "passport"
    : hasPrBundle
    ? "pr"
    : null;

  const [selectedOption, setSelectedOption] = React.useState<
    "passport" | "pr" | null
  >(initialSelection);

  React.useEffect(() => {
    setSelectedOption(initialSelection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passportPhotosCount, prPermitCitizenshipPhotosCount]);

  const handleOptionChange = (option: "passport" | "pr") => {
    if (!isEditMode) return;
    setSelectedOption(option);

    if (option === "passport") {
      onStage({
        // Explicitly clear PR / Permit bundle
        prPermitCitizenshipDetails: null,
        prPermitCitizenshipPhotos: [],
      });
    } else {
      onStage({
        // Explicitly clear Passport bundle
        passportDetails: null,
        passportPhotos: [],
      });
    }
  };

  // ---------- safe details ----------
  const safePassportDetails: IPassportDetails = {
    documentNumber: passportDetails?.documentNumber ?? "",
    issuingAuthority: passportDetails?.issuingAuthority ?? "",
    countryOfIssue: passportDetails?.countryOfIssue ?? "",
    expiryDate: normalizeDateForInput(passportDetails?.expiryDate),
  };

  const prDocTypes = Object.values(EPrPermitDocumentType);

  const safePrDetails: IPrPermitDetails = {
    documentType: prPermitCitizenshipDetails?.documentType ?? prDocTypes[0],
    documentNumber: prPermitCitizenshipDetails?.documentNumber ?? "",
    issuingAuthority: prPermitCitizenshipDetails?.issuingAuthority ?? "",
    countryOfIssue: prPermitCitizenshipDetails?.countryOfIssue ?? "",
    expiryDate: normalizeDateForInput(prPermitCitizenshipDetails?.expiryDate),
  };

  // ---------- handlers ----------
  const handleImmigrationChange = (value: string) => {
    onStage({
      immigrationStatusInUS: value as EImmigrationStatusUS,
    });
  };

  const handlePassportDetailChange = (
    field: keyof IPassportDetails,
    value: string
  ) => {
    onStage({
      passportDetails: {
        ...safePassportDetails,
        [field]: field === "expiryDate" ? value || null : value,
      },
    });
  };

  const handlePrDetailChange = (
    field: keyof IPrPermitDetails,
    value: string | EPrPermitDocumentType
  ) => {
    onStage({
      prPermitCitizenshipDetails: {
        ...safePrDetails,
        [field]: field === "expiryDate" ? value || null : value,
      },
    });
  };

  const immigrationOptions = Object.values(EImmigrationStatusUS);

  const humanize = (val: string) =>
    val
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  // ---------- render ----------
  return (
    <div
      className="rounded-xl border p-6 shadow-sm"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-outline)",
      }}
    >
      <div
        className="flex items-center gap-3 pb-2 border-b mb-4"
        style={{ borderColor: "var(--color-outline)" }}
      >
        <div
          className="w-1 h-8 rounded-full"
          style={{ background: "var(--color-secondary-container)" }}
        />
        <div
          className="flex items-center gap-2"
          style={{ color: "var(--color-on-surface)" }}
        >
          <FileBadge2 className="h-4 w-4" />
          <h3 className="font-medium">Immigration & Work Authorization (US)</h3>
        </div>
      </div>

      <div className="space-y-5">
        {/* Immigration status */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Immigration Status in US <span className="text-red-500">*</span>
          </label>
          <select
            value={immigrationStatusInUS ?? ""}
            disabled={!isEditMode}
            onChange={(e) => handleImmigrationChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            style={{
              background: isEditMode
                ? "var(--color-surface)"
                : "var(--color-surface-variant)",
              borderColor: "var(--color-outline)",
              color: "var(--color-on-surface)",
            }}
          >
            <option value="">Select status</option>
            {immigrationOptions.map((val) => (
              <option key={val} value={val}>
                {humanize(val)}
              </option>
            ))}
          </select>
        </div>

        {/* Option selector */}
        <div className="space-y-3">
          <p
            className="text-xs"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Choose one work authorization bundle. The other bundle will be
            cleared automatically.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!isEditMode}
              onClick={() => handleOptionChange("passport")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedOption === "passport"
                  ? "border-primary"
                  : "border-outline"
              }`}
              style={{
                background:
                  selectedOption === "passport"
                    ? "var(--color-primary-container)"
                    : "var(--color-surface-variant)",
                color: "var(--color-on-surface)",
                opacity: isEditMode ? 1 : 0.7,
              }}
            >
              Use Passport
            </button>

            <button
              type="button"
              disabled={!isEditMode}
              onClick={() => handleOptionChange("pr")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedOption === "pr" ? "border-primary" : "border-outline"
              }`}
              style={{
                background:
                  selectedOption === "pr"
                    ? "var(--color-primary-container)"
                    : "var(--color-surface-variant)",
                color: "var(--color-on-surface)",
                opacity: isEditMode ? 1 : 0.7,
              }}
            >
              Use PR / Permit / Citizenship
            </button>
          </div>
        </div>

        {/* Passport bundle */}
        {selectedOption === "passport" && (
          <div
            className="mt-2 space-y-3 rounded-lg border p-3"
            style={{ borderColor: "var(--color-outline)" }}
          >
            <p
              className="text-xs mb-1"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Passport bundle requires <strong>exactly 2</strong> PDFs in the
              Document Gallery and all details below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Document Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={safePassportDetails.documentNumber}
                  disabled={!isEditMode}
                  onChange={(e) =>
                    handlePassportDetailChange("documentNumber", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  style={{
                    background: isEditMode
                      ? "var(--color-surface)"
                      : "var(--color-surface-variant)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Issuing Authority <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={safePassportDetails.issuingAuthority}
                  disabled={!isEditMode}
                  onChange={(e) =>
                    handlePassportDetailChange(
                      "issuingAuthority",
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  style={{
                    background: isEditMode
                      ? "var(--color-surface)"
                      : "var(--color-surface-variant)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Country of Issue <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={safePassportDetails.countryOfIssue}
                  disabled={!isEditMode}
                  onChange={(e) =>
                    handlePassportDetailChange("countryOfIssue", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  style={{
                    background: isEditMode
                      ? "var(--color-surface)"
                      : "var(--color-surface-variant)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Expiry Date (optional)
                </label>
                <input
                  type="date"
                  value={safePassportDetails.expiryDate as string}
                  disabled={!isEditMode}
                  onChange={(e) =>
                    handlePassportDetailChange("expiryDate", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  style={{
                    background: isEditMode
                      ? "var(--color-surface)"
                      : "var(--color-surface-variant)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* PR / Permit / Citizenship bundle */}
        {selectedOption === "pr" && (
          <div
            className="mt-2 space-y-3 rounded-lg border p-3"
            style={{ borderColor: "var(--color-outline)" }}
          >
            <p
              className="text-xs mb-1"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              PR / Permit / Citizenship bundle requires <strong>1–2</strong>{" "}
              PDFs in the Document Gallery and all details below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Document Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={safePrDetails.documentType}
                  disabled={!isEditMode}
                  onChange={(e) =>
                    handlePrDetailChange(
                      "documentType",
                      e.target.value as EPrPermitDocumentType
                    )
                  }
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  style={{
                    background: isEditMode
                      ? "var(--color-surface)"
                      : "var(--color-surface-variant)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                >
                  {prDocTypes.map((val) => (
                    <option key={val} value={val}>
                      {humanize(val)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Document Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={safePrDetails.documentNumber}
                  disabled={!isEditMode}
                  onChange={(e) =>
                    handlePrDetailChange("documentNumber", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  style={{
                    background: isEditMode
                      ? "var(--color-surface)"
                      : "var(--color-surface-variant)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Issuing Authority <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={safePrDetails.issuingAuthority}
                  disabled={!isEditMode}
                  onChange={(e) =>
                    handlePrDetailChange("issuingAuthority", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  style={{
                    background: isEditMode
                      ? "var(--color-surface)"
                      : "var(--color-surface-variant)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Country of Issue <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={safePrDetails.countryOfIssue}
                  disabled={!isEditMode}
                  onChange={(e) =>
                    handlePrDetailChange("countryOfIssue", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  style={{
                    background: isEditMode
                      ? "var(--color-surface)"
                      : "var(--color-surface-variant)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Expiry Date (optional)
                </label>
                <input
                  type="date"
                  value={safePrDetails.expiryDate as string}
                  disabled={!isEditMode}
                  onChange={(e) =>
                    handlePrDetailChange("expiryDate", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  style={{
                    background: isEditMode
                      ? "var(--color-surface)"
                      : "var(--color-surface-variant)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {!isEditMode && (
          <p
            className="text-xs"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Turn Edit Mode ON to modify immigration status or work authorization
            details.
          </p>
        )}
      </div>
    </div>
  );
}
