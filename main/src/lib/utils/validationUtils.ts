
import { COMPANIES } from "@/constants/companies";
import { differenceInDays } from "date-fns";
import { IEmploymentEntry } from "@/types/applicationForm.types";
import mongoose from "mongoose";

// validates postal code based on company
export function validatePostalCodeByCompany(
  postalCode: string,
  companyId: string
): string | null {
  const company = COMPANIES.find((c) => c.id === companyId);
  if (!company) return "Invalid companyId provided.";

  const countryCode = company.countryCode;
  const cleaned = postalCode.replace(/\s+/g, "");

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

  return null; // valid
}

type ValidationError = {
  isValid: false;
  errorMessage: string;
};

type ValidationSuccess = {
  isValid: true;
  safeFile: File;
};

// validates image file
export function validateImageFile(
  file: unknown,
  displayName: string = "uploaded file",
  maxSizeBytes = 10 * 1024 * 1024,
  allowedTypes = ["image/jpeg", "image/png", "image/webp"]
): ValidationSuccess | ValidationError {
  if (!file) {
    return {
      isValid: false,
      errorMessage: `${displayName} is not provided`,
    };
  }

  if (!(file instanceof File)) {
    return {
      isValid: false,
      errorMessage: `${displayName} is not a valid image.`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      errorMessage: `${displayName} is not a supported image type. Allowed types are: ${allowedTypes
        .map((t) => t.split("/")[1])
        .join(", ")}.`,
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      errorMessage: `${displayName} exceeds the maximum size of ${Math.floor(
        maxSizeBytes / (1024 * 1024)
      )}MB.`,
    };
  }

  return { isValid: true, safeFile: file };
}

// validates employment history
export function validateEmploymentHistory(
  employments: IEmploymentEntry[]
): string | null {
  if (!Array.isArray(employments) || employments.length === 0) {
    return "At least one employment entry is required.";
  }

  if (employments.length > 5) {
    return "A maximum of 5 employment entries is allowed.";
  }

  // Sort by `from` date descending (most recent first)
  const sorted = [...employments].sort(
    (a, b) => new Date(b.from).getTime() - new Date(a.from).getTime()
  );

  let totalDays = 0;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const from = new Date(current.from);
    const to = new Date(current.to);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return `Invalid date format in employment entry for ${current.supervisorName}`;
    }

    if (to < from) {
      return `End date cannot be before start date in job at ${current.supervisorName}`;
    }

    // Calculate exact days for this employment period
    const daysInThisJob = differenceInDays(to, from) + 1; // +1 to include both start and end dates
    totalDays += daysInThisJob;

    const next = sorted[i + 1];
    if (next) {
      const nextTo = new Date(next.to);

      // ❌ Overlap check: current.from must be >= next.to
      if (from < nextTo) {
        return `Job at ${current.supervisorName} overlaps with job at ${next.supervisorName}`;
      }

      // Gap check
      const gapDays = differenceInDays(from, nextTo);
      if (
        gapDays >= 30 &&
        (!current.gapExplanationBefore ||
          current.gapExplanationBefore.trim() === "")
      ) {
        return `Missing gap explanation before employment at ${current.supervisorName}`;
      }
    }
  }

  // Convert days to months for comparison (using 30.44 days per month average)
  const requiredDaysFor2Years = 730; // 2 years = 730 days
  const requiredDaysFor10Years = 3650; // 10 years = 3650 days

  if (totalDays >= requiredDaysFor2Years && totalDays <= 760) {
    return null; // ✅ Exactly 2 years or more, but less than 2 years + 30 days buffer
  }

  if (totalDays > 760 && totalDays < requiredDaysFor10Years) {
    return "If experience is over 2 years + 30 days, a full 10 years of history must be entered.";
  }

  if (totalDays < requiredDaysFor2Years) {
    const months = Math.round(totalDays / 30.44);
    return `Employment duration of ${months} months (${totalDays} days) detected. You must provide 2 years of employment history.`;
  }

  if (totalDays >= requiredDaysFor10Years) {
    return null; // ✅ 10+ years
  }

  return "Employment history validation failed.";
}

export function isValidSIN(
  sinInput: string | number | undefined
): sinInput is string {
  if (!sinInput) return false;
  const sin = String(sinInput).trim();

  if (!/^\d{9}$/.test(sin)) return false;

  // if (!IS_PRODUCTION) return true;

  // const digits = sin.split("").map(Number);
  // let sum = 0;

  // for (let i = 0; i < digits.length; i++) {
  //   let digit = digits[i];
  //   if (i % 2 === 1) {
  //     digit *= 2;
  //     if (digit > 9) digit -= 9;
  //   }
  //   sum += digit;
  // }

  // return sum % 10 === 0;
  return true;
}

/**
 * Checks if the given value is a valid MongoDB ObjectId.
 * @param id - The value to check.
 * @returns True if valid, false otherwise.
 */
export function isValidObjectId(id: unknown): boolean {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
}

/**
 * Validates email format.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates North American phone number format (min 10 digits, numeric only).
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\d{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Validates reasonable date of birth (must be a valid date and age between 23–100).
 */
export function isValidDOB(dobInput: string | Date): boolean {
  const dob = new Date(dobInput);
  if (isNaN(dob.getTime())) return false;

  const now = new Date();
  const age = now.getFullYear() - dob.getFullYear();
  return age >= 23 && age <= 100;
}
