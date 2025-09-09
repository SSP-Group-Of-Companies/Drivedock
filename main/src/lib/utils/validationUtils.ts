// main/src/lib/utils/validationUtils.ts

/**
 * DriveDock — Shared Validation Utilities
 * ---------------------------------------
 * Used by both frontend (Zod schemas / UI checks) and backend (API guards).
 *
 * Notes:
 * - Employment history messages intentionally match the strings used in
 *   applicationFormPage2.schema.ts's .superRefine() so we can map messages
 *   back to specific fields (gap explanation / overlaps).
 * - Postal code validation is company-aware (US vs CA).
 */

import { differenceInDays } from "date-fns";
import mongoose from "mongoose";

import { COMPANIES } from "@/constants/companies";
import { EGender, type IEmploymentEntry } from "@/types/applicationForm.types";

/* ================================
 * Postal / Image / Basic Validators
 * ================================ */

/**
 * Validate postal/ZIP code against the selected company's country.
 * Returns null if valid; otherwise an error string.
 */
export function validatePostalCodeByCompany(postalCode: string, companyId: string): string | null {
  const company = COMPANIES.find((c) => c.id === companyId);
  if (!company) return "Invalid companyId provided.";

  const countryCode = company.countryCode;
  const cleaned = (postalCode || "").replace(/\s+/g, "");

  if (countryCode === "CA") {
    const canadianRegex = /^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/;
    if (!canadianRegex.test(cleaned)) {
      return `"${postalCode}" is not a valid Canadian postal code.`;
    }
  } else if (countryCode === "US") {
    const usRegex = /^(\d{5}|\d{9})$/;
    if (!usRegex.test(cleaned)) {
      return `"${postalCode}" is not a valid US ZIP code.`;
    }
  }

  return null;
}

type ValidationError = { isValid: false; errorMessage: string };
type ValidationSuccess = { isValid: true; safeFile: File };

/**
 * Lightweight image validation for client-side checks.
 * Do not call this on the server (relies on the browser File type).
 */
export function validateImageFile(
  file: unknown,
  displayName = "uploaded file",
  maxSizeBytes = 10 * 1024 * 1024,
  allowedTypes = ["image/jpeg", "image/png", "image/webp"]
): ValidationSuccess | ValidationError {
  if (!file) {
    return { isValid: false, errorMessage: `${displayName} is not provided` };
  }

  if (!(file instanceof File)) {
    return {
      isValid: false,
      errorMessage: `${displayName} is not a valid image.`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    const list = allowedTypes.map((t) => t.split("/")[1]).join(", ");
    return {
      isValid: false,
      errorMessage: `${displayName} is not a supported image type. Allowed types are: ${list}.`,
    };
  }

  if (file.size > maxSizeBytes) {
    const mb = Math.floor(maxSizeBytes / (1024 * 1024));
    return {
      isValid: false,
      errorMessage: `${displayName} exceeds the maximum size of ${mb}MB.`,
    };
  }

  return { isValid: true, safeFile: file };
}

/**
 * Basic format validators used across pages.
 */
export function isValidSIN(sinInput: string | number | undefined): sinInput is string {
  if (!sinInput) return false;
  const sin = String(sinInput).trim();
  return /^\d{9}$/.test(sin);
}

export function isValidObjectId(id: unknown): boolean {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
}

export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function isValidPhoneNumber(phone: string): boolean {
  // 10+ digits, numeric only
  return /^\d{10,}$/.test(phone);
}

export function isValidDOB(dobInput: string | Date): boolean {
  const dob = new Date(dobInput);
  if (Number.isNaN(dob.getTime())) return false;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;

  return age >= 23 && age <= 100;
}

export function isValidSINIssueDate(dateInput: string | Date): boolean {
  const issueDate = new Date(dateInput);
  if (Number.isNaN(issueDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Issue date cannot be in the future
  if (issueDate > today) return false;

  // Issue date cannot be more than 100 years ago (reasonable limit)
  const hundredYearsAgo = new Date();
  hundredYearsAgo.setFullYear(today.getFullYear() - 100);

  return issueDate >= hundredYearsAgo;
}

export function isValidGender(gender: string): boolean {
  return Object.values(EGender).includes(gender as any);
}

/* ================================
 * Employment History (Backend-parity)
 * ================================ */

/**
 * Backend-parity employment validation.
 * Returns null when valid; otherwise a human message (used by Zod .superRefine).
 *
 * Rules:
 * - Require ≥ 1 entry and ≤ 5 entries
 * - Dates must be valid; to >= from
 * - No overlaps (current.from >= next.to when sorted by from desc)
 * - Gaps ≥ 30 days require a non-empty gapExplanationBefore on the later job
 * - Totals:
 *   - < 2y (730d): invalid (message includes months/days)
 *   - >= 2y and <= 2y + 30d (730–760d): valid
 *   - > 2y + 30d and < 10y (760–3649d): invalid → must provide full 10 years
 *   - >= 10y (3650d): valid
 *
 * Message strings align with applicationFormPage2.schema.ts mappings.
 */
export function validateEmploymentHistory(employments: IEmploymentEntry[]): string | null {
  if (!Array.isArray(employments) || employments.length === 0) {
    return "At least one employment entry is required.";
  }

  if (employments.length > 5) {
    return "A maximum of 5 employment entries is allowed.";
  }

  // Sort by from date DESC (most recent first)
  const sorted = [...employments].sort((a, b) => new Date(b.from).getTime() - new Date(a.from).getTime());

  let totalDays = 0;

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    const from = new Date(curr.from);
    const to = new Date(curr.to);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return `Invalid date format in employment entry for ${curr.supervisorName}`;
    }

    if (to < from) {
      return `End date cannot be before start date in job at ${curr.supervisorName}`;
    }

    // Inclusive days in this job
    const daysInThisJob = differenceInDays(to, from) + 1;
    totalDays += daysInThisJob;

    const next = sorted[i + 1];
    if (next) {
      const nextTo = new Date(next.to);

      // Overlap: current.from must be >= next.to
      if (from < nextTo) {
        return `Job at ${curr.supervisorName} overlaps with job at ${next.supervisorName}`;
      }

      // Gap check (≥ 30d requires explanation on the later job)
      const gapDays = differenceInDays(from, nextTo);
      if (gapDays >= 30 && (!curr.gapExplanationBefore || curr.gapExplanationBefore.trim() === "")) {
        return `Missing gap explanation before employment at ${curr.supervisorName}`;
      }
    }
  }

  const DAYS_2Y = 730;
  const DAYS_2Y_PLUS_30 = 760;
  const DAYS_10Y = 3650;

  if (totalDays >= DAYS_2Y && totalDays <= DAYS_2Y_PLUS_30) {
    return null; // exactly 2y or up to +30d buffer
  }

  if (totalDays > DAYS_2Y_PLUS_30 && totalDays < DAYS_10Y) {
    return "If experience is over 2 years + 30 days, a full 10 years of history must be entered.";
  }

  if (totalDays < DAYS_2Y) {
    const months = Math.round(totalDays / 30.44);
    return `Employment duration of ${months} months (${totalDays} days) detected. You must provide 2 years of employment history.`;
  }

  if (totalDays >= DAYS_10Y) {
    return null; // 10+ years
  }

  return "Employment history validation failed.";
}
