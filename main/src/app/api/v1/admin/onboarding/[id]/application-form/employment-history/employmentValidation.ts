// Employment Validation Utilities for Employment History
// Single source of truth for both onboarding and admin employment validation
// Extracts validation logic from validationUtils and Zod schemas

import { differenceInDays } from "date-fns";
import { IEmploymentEntry } from "@/types/applicationForm.types";

export interface EmploymentValidationError {
  type: 'required' | 'overlap' | 'gap' | 'coverage' | 'individual' | 'date' | 'count';
  message: string;
  employmentIndex?: number;
  field?: string;
}

/**
 * Validates a single employment entry
 */
export function validateSingleEmployment(employment: IEmploymentEntry, index: number): EmploymentValidationError | null {
  // Check if required fields are filled
  if (!employment.employerName?.trim()) {
    return {
      type: 'required',
      message: 'Employer name is required',
      employmentIndex: index,
      field: 'employerName'
    };
  }
  
  if (!employment.supervisorName?.trim()) {
    return {
      type: 'required',
      message: 'Supervisor name is required',
      employmentIndex: index,
      field: 'supervisorName'
    };
  }
  
  if (!employment.address?.trim()) {
    return {
      type: 'required',
      message: 'Address is required',
      employmentIndex: index,
      field: 'address'
    };
  }
  
  if (!employment.postalCode?.trim()) {
    return {
      type: 'required',
      message: 'Postal code is required',
      employmentIndex: index,
      field: 'postalCode'
    };
  }
  
  if (!employment.city?.trim()) {
    return {
      type: 'required',
      message: 'City is required',
      employmentIndex: index,
      field: 'city'
    };
  }
  
  if (!employment.stateOrProvince?.trim()) {
    return {
      type: 'required',
      message: 'State/Province is required',
      employmentIndex: index,
      field: 'stateOrProvince'
    };
  }
  
  if (!employment.phone1?.trim()) {
    return {
      type: 'required',
      message: 'Primary phone number is required',
      employmentIndex: index,
      field: 'phone1'
    };
  }
  
  if (!employment.email?.trim()) {
    return {
      type: 'required',
      message: 'Email is required',
      employmentIndex: index,
      field: 'email'
    };
  }
  
  if (!employment.positionHeld?.trim()) {
    return {
      type: 'required',
      message: 'Position held is required',
      employmentIndex: index,
      field: 'positionHeld'
    };
  }
  
  if (!employment.from) {
    return {
      type: 'required',
      message: 'Start date is required',
      employmentIndex: index,
      field: 'from'
    };
  }
  
  if (!employment.to) {
    return {
      type: 'required',
      message: 'End date is required',
      employmentIndex: index,
      field: 'to'
    };
  }
  
  if (!employment.salary || String(employment.salary).trim() === '') {
    return {
      type: 'required',
      message: 'Salary is required',
      employmentIndex: index,
      field: 'salary'
    };
  }
  
  if (!employment.reasonForLeaving?.trim()) {
    return {
      type: 'required',
      message: 'Reason for leaving is required',
      employmentIndex: index,
      field: 'reasonForLeaving'
    };
  }
  
  if (employment.subjectToFMCSR === undefined) {
    return {
      type: 'required',
      message: 'Please specify if you were subject to FMCSR',
      employmentIndex: index,
      field: 'subjectToFMCSR'
    };
  }
  
  if (employment.safetySensitiveFunction === undefined) {
    return {
      type: 'required',
      message: 'Please specify if your job was safety sensitive',
      employmentIndex: index,
      field: 'safetySensitiveFunction'
    };
  }

  // Check if dates are valid
  const fromDate = new Date(employment.from);
  const toDate = new Date(employment.to);
  
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return {
      type: 'date',
      message: 'Invalid date format',
      employmentIndex: index,
      field: 'from'
    };
  }
  
  // Check if from date is before to date
  if (fromDate >= toDate) {
    return {
      type: 'date',
      message: 'Start date must be before end date',
      employmentIndex: index,
      field: 'from'
    };
  }

  return null;
}

/**
 * Validates employment count requirements
 */
export function validateEmploymentCount(employments: IEmploymentEntry[]): EmploymentValidationError | null {
  if (!Array.isArray(employments) || employments.length === 0) {
    return {
      type: 'count',
      message: 'At least one employment entry is required'
    };
  }

  if (employments.length > 5) {
    return {
      type: 'count',
      message: 'A maximum of 5 employment entries is allowed'
    };
  }

  return null;
}

/**
 * Validates employment overlaps and gaps (extracted from validationUtils)
 */
export function validateEmploymentOverlapsAndGaps(employments: IEmploymentEntry[]): EmploymentValidationError | null {
  if (employments.length < 2) return null;

  // Sort by from date DESC (most recent first) - same logic as validationUtils
  const sorted = [...employments].sort(
    (a, b) => new Date(b.from).getTime() - new Date(a.from).getTime()
  );

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    
    const currFrom = new Date(curr.from);
    const nextTo = new Date(next.to);
    
    // Overlap: current.from must be >= next.to (same logic as validationUtils)
    if (currFrom < nextTo) {
      return {
        type: 'overlap',
        message: `Job at ${curr.supervisorName} overlaps with job at ${next.supervisorName}`,
        employmentIndex: i
      };
    }
    
    // Gap check (≥ 30d requires explanation on the later job) - same logic as validationUtils
    const gapDays = differenceInDays(currFrom, nextTo);
    if (
      gapDays >= 30 &&
      (!curr.gapExplanationBefore || curr.gapExplanationBefore.trim() === "")
    ) {
      return {
        type: 'gap',
        message: `Missing gap explanation before employment at ${curr.supervisorName}`,
        employmentIndex: i
      };
    }
  }

  return null;
}

/**
 * Validates employment coverage requirements (extracted from validationUtils)
 */
export function validateEmploymentCoverage(employments: IEmploymentEntry[]): EmploymentValidationError | null {
  if (employments.length === 0) return null;

  // Sort by from date DESC (most recent first) - same logic as validationUtils
  const sorted = [...employments].sort(
    (a, b) => new Date(b.from).getTime() - new Date(a.from).getTime()
  );

  let totalDays = 0;

  for (const employment of sorted) {
    const from = new Date(employment.from);
    const to = new Date(employment.to);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return {
        type: 'date',
        message: `Invalid date format in employment entry for ${employment.supervisorName}`
      };
    }

    if (to < from) {
      return {
        type: 'date',
        message: `End date cannot be before start date in job at ${employment.supervisorName}`
      };
    }

    // Inclusive days in this job - same logic as validationUtils
    const daysInThisJob = differenceInDays(to, from) + 1;
    totalDays += daysInThisJob;
  }

  const DAYS_2Y = 730;
  const DAYS_2Y_PLUS_30 = 760;
  const DAYS_10Y = 3650;

  if (totalDays >= DAYS_2Y && totalDays <= DAYS_2Y_PLUS_30) {
    return null; // ✅ exactly 2y or up to +30d buffer
  }

  if (totalDays > DAYS_2Y_PLUS_30 && totalDays < DAYS_10Y) {
    return {
      type: 'coverage',
      message: 'If experience is over 2 years + 30 days, a full 10 years of history must be entered.'
    };
  }

  if (totalDays < DAYS_2Y) {
    const months = Math.round(totalDays / 30.44);
    return {
      type: 'coverage',
      message: `Employment duration of ${months} months (${totalDays} days) detected. You must provide 2 years of employment history.`
    };
  }

  if (totalDays >= DAYS_10Y) {
    return null; // ✅ 10+ years
  }

  return {
    type: 'coverage',
    message: 'Employment history validation failed.'
  };
}

/**
 * Comprehensive employment validation function
 */
export function validateEmployments(employments: IEmploymentEntry[]): EmploymentValidationError[] {
  const errors: EmploymentValidationError[] = [];

  // Validate employment count
  const countError = validateEmploymentCount(employments);
  if (countError) {
    errors.push(countError);
    return errors; // Don't continue with individual validation if count is wrong
  }

  // Validate individual employments
  employments.forEach((employment, index) => {
    const error = validateSingleEmployment(employment, index);
    if (error) errors.push(error);
  });

  // If individual validations pass, check other rules
  if (errors.length === 0) {
    // Check overlaps and gaps
    const overlapError = validateEmploymentOverlapsAndGaps(employments);
    if (overlapError) errors.push(overlapError);

    // Check coverage
    const coverageError = validateEmploymentCoverage(employments);
    if (coverageError) errors.push(coverageError);
  }

  return errors;
}

/**
 * Check if employments are valid (no errors)
 */
export function areEmploymentsValid(employments: IEmploymentEntry[]): boolean {
  return validateEmployments(employments).length === 0;
}

/**
 * Get a user-friendly summary of validation errors
 */
export function getEmploymentValidationSummary(errors: EmploymentValidationError[]): string {
  if (errors.length === 0) return 'Employment history is valid';

  const errorTypes = errors.map(e => e.type);
  const uniqueTypes = [...new Set(errorTypes)];

  if (uniqueTypes.includes('required')) {
    return 'Please fill in all required employment fields';
  }
  
  if (uniqueTypes.includes('overlap')) {
    return 'Employment dates cannot overlap';
  }
  
  if (uniqueTypes.includes('gap')) {
    return 'Gaps of 30+ days require explanation';
  }
  
  if (uniqueTypes.includes('coverage')) {
    return 'Employment history must meet coverage requirements';
  }
  
  if (uniqueTypes.includes('date')) {
    return 'Please check employment dates';
  }
  
  if (uniqueTypes.includes('count')) {
    return 'Employment entry count is invalid';
  }

  return 'Employment validation failed';
}
