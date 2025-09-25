// Address Validation Utilities for Personal Details
// Single source of truth for both onboarding and admin address validation
// Extracts validation logic from Zod schemas and existing utilities

import { Iaddress } from "@/types/applicationForm.types";
import { hasRecentAddressCoverage } from "@/lib/utils/hasMinimumAddressDuration";

export interface AddressValidationError {
  type: 'overlap' | 'gap' | 'coverage' | 'recent' | 'individual' | 'required';
  message: string;
  addressIndex?: number;
  field?: string;
}

/**
 * Validates a single address entry
 */
export function validateSingleAddress(address: Iaddress, index: number): AddressValidationError | null {
  // Check if required fields are filled
  if (!address.address?.trim()) {
    return {
      type: 'required',
      message: 'Street address is required',
      addressIndex: index,
      field: 'address'
    };
  }
  
  if (!address.city?.trim()) {
    return {
      type: 'required',
      message: 'City is required',
      addressIndex: index,
      field: 'city'
    };
  }
  
  if (!address.stateOrProvince?.trim()) {
    return {
      type: 'required',
      message: 'State/Province is required',
      addressIndex: index,
      field: 'stateOrProvince'
    };
  }
  
  if (!address.postalCode?.trim()) {
    return {
      type: 'required',
      message: 'Postal code is required',
      addressIndex: index,
      field: 'postalCode'
    };
  }
  
  if (!address.from) {
    return {
      type: 'required',
      message: 'From date is required',
      addressIndex: index,
      field: 'from'
    };
  }
  
  if (!address.to) {
    return {
      type: 'required',
      message: 'To date is required',
      addressIndex: index,
      field: 'to'
    };
  }

  // Check if dates are valid
  const fromDate = new Date(address.from);
  const toDate = new Date(address.to);
  
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return {
      type: 'individual',
      message: 'Invalid date format',
      addressIndex: index,
      field: 'from'
    };
  }
  
  // Check if from date is before to date
  if (fromDate >= toDate) {
    return {
      type: 'individual',
      message: 'From date must be before to date',
      addressIndex: index,
      field: 'from'
    };
  }

  return null;
}

/**
 * Validates address overlaps and gaps (extracted from Zod schema)
 */
export function validateAddressOverlapsAndGaps(addresses: Iaddress[]): AddressValidationError | null {
  if (addresses.length < 2) return null;

  // Sort addresses by from date (oldest first) - same logic as Zod schema
  const sorted = [...addresses].sort(
    (a, b) => new Date(a.from).getTime() - new Date(b.from).getTime()
  );

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    
    const currEnd = new Date(curr.to);
    const nextStart = new Date(next.from);
    
    // Check for overlaps (current end > next start) - same logic as Zod schema
    if (currEnd > nextStart) {
      return {
        type: 'overlap',
        message: `Address ${i + 1} overlaps with address ${i + 2}. End date cannot be after the next address's start date.`,
        addressIndex: i
      };
    }
    
    // Check for gaps > 2 years (730 days) - same logic as Zod schema
    const gapDays = (nextStart.getTime() - currEnd.getTime()) / (1000 * 60 * 60 * 24);
    if (gapDays > 730) {
      return {
        type: 'gap',
        message: `Gap between address ${i + 1} and ${i + 2} is ${gapDays} days. Gaps cannot exceed 2 years (730 days).`,
        addressIndex: i
      };
    }
  }

  return null;
}

/**
 * Validates 5-year coverage requirement using existing utility
 */
export function validateAddressCoverage(addresses: Iaddress[]): AddressValidationError | null {
  if (addresses.length === 0) {
    return {
      type: 'coverage',
      message: 'At least one address is required'
    };
  }

  // Use existing utility function for consistency
  if (!hasRecentAddressCoverage(addresses, 5)) {
    return {
      type: 'coverage',
      message: 'You must provide at least 5 years of address history. If you haven\'t lived in one place for 5 years, please add additional addresses.'
    };
  }

  return null;
}

/**
 * Validates that most recent address extends to within last 6 months (extracted from Zod schema)
 */
export function validateRecentAddress(addresses: Iaddress[]): AddressValidationError | null {
  if (addresses.length === 0) return null;

  // Same logic as Zod schema
  const valid = addresses.filter(a => a.to && String(a.to).trim());
  if (!valid.length) {
    return {
      type: 'recent',
      message: 'No valid end dates found in address history'
    };
  }

  const lastEnd = new Date(
    valid
      .sort((a, b) => new Date(a.to).getTime() - new Date(b.to).getTime())
      .at(-1)!.to
  );

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  if (lastEnd < sixMonthsAgo) {
    return {
      type: 'recent',
      message: 'Your most recent address must extend to within the last 6 months'
    };
  }

  return null;
}

/**
 * Comprehensive address validation function
 */
export function validateAddresses(addresses: Iaddress[]): AddressValidationError[] {
  const errors: AddressValidationError[] = [];

  // Validate individual addresses
  addresses.forEach((address, index) => {
    const error = validateSingleAddress(address, index);
    if (error) errors.push(error);
  });

  // If individual validations pass, check other rules
  if (errors.length === 0) {
    // Check overlaps and gaps
    const overlapError = validateAddressOverlapsAndGaps(addresses);
    if (overlapError) errors.push(overlapError);

    // Check coverage using existing utility
    const coverageError = validateAddressCoverage(addresses);
    if (coverageError) errors.push(coverageError);

    // Check recent address
    const recentError = validateRecentAddress(addresses);
    if (recentError) errors.push(recentError);
  }

  return errors;
}

/**
 * Check if addresses are valid (no errors)
 */
export function areAddressesValid(addresses: Iaddress[]): boolean {
  return validateAddresses(addresses).length === 0;
}

/**
 * Get a user-friendly summary of validation errors
 */
export function getAddressValidationSummary(errors: AddressValidationError[]): string {
  if (errors.length === 0) return 'Address history is valid';

  const errorTypes = errors.map(e => e.type);
  const uniqueTypes = [...new Set(errorTypes)];

  if (uniqueTypes.includes('required')) {
    return 'Please fill in all required address fields';
  }
  
  if (uniqueTypes.includes('overlap')) {
    return 'Address dates cannot overlap';
  }
  
  if (uniqueTypes.includes('gap')) {
    return 'Gaps between addresses cannot exceed 2 years';
  }
  
  if (uniqueTypes.includes('coverage')) {
    return 'Address history must cover at least 5 years';
  }
  
  if (uniqueTypes.includes('recent')) {
    return 'Most recent address must extend to within last 6 months';
  }

  return 'Address validation failed';
}
