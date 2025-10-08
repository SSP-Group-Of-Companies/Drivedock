/**
 * ===============================================================
 * DriveDock - Pre-Qualifications Types
 * ---------------------------------------------------------------
 * Shared Type Definitions between Backend & Frontend
 *
 * Purpose:
 *   Defines the structure for the Pre-Qualification step in the
 *   driver onboarding process (Step 1 of the wizard).
 *
 * Usage:
 *   - Frontend: Used to type state (Zustand), form validation, and API payloads.
 *   - Backend: Used to validate incoming data and persist to MongoDB.
 *
 * Notes:
 *   - All boolean fields are required unless explicitly marked optional.
 *   - Optional fields (`canCrossBorderUSA`, `hasFASTCard`) apply only for
 *     Canadian applicants.
 *   - `completed` must be true before proceeding to Step 2.
 *   - This schema must remain in sync across FE and BE to avoid validation errors.
 * ===============================================================
 */

import { Document } from "mongoose";

/**
 * Driver Type (employment relationship)
 */
export enum EDriverType {
  Company = "Company", // Employee driver
  OwnerOperator = "Owner Operator", // Contractor with own truck
  OwnerDriver = "Owner Driver", // Contractor owning & driving truck
}

/**
 * Haul Preference (trip length preference)
 */
export enum EHaulPreference {
  ShortHaul = "Short Haul", // Local/regional trips
  LongHaul = "Long Haul", // Cross-country / long distance
}

/**
 * Team Status (solo vs team driving)
 */
export enum ETeamStatus {
  Team = "Team", // Works with a co-driver
  Single = "Single", // Drives alone
}

/**
 * Status in Canada (for Canadian applicants only)
 */
export enum EStatusInCanada {
  PR = "PR", // Permanent Resident
  Citizenship = "Citizenship", // Canadian Citizen
  WorkPermit = "Work Permit", // Work Permit holder
}

/**
 * Pre-Qualification Data Structure
 * ---------------------------------
 * Captures eligibility and preference information
 * before starting the main application form.
 */
export interface IPreQualifications {
  // Eligibility Checks
  over23Local: boolean; // True if age ≥ 23 (local driving)
  over25CrossBorder: boolean; // True if age ≥ 25 (cross-border driving)
  canDriveManual: boolean; // Can operate manual transmission
  experienceDrivingTractorTrailer: boolean; // Has tractor-trailer driving experience
  faultAccidentIn3Years: boolean; // Any fault accidents in last 3 years
  zeroPointsOnAbstract: boolean; // Zero demerit points on driver abstract
  noUnpardonedCriminalRecord: boolean; // No unpardoned criminal record
  legalRightToWorkCanada: boolean; // Eligible to work in Canada

  // Conditional (Canada-specific)
  canCrossBorderUSA?: boolean; // Required if applicant is Canadian
  hasFASTCard?: boolean; // Required if applicant is Canadian
  statusInCanada?: EStatusInCanada; // Required if applicant is Canadian
  eligibleForFASTCard?: boolean; // Required if PR/Citizen and no FAST card

  // Preference Categories
  driverType: EDriverType; // Employment type
  haulPreference: EHaulPreference; // Trip length preference
  teamStatus: ETeamStatus; // Solo or team driving
  flatbedExperience: boolean; // Has flatbed trailer experience

  // Confirmation
  completed: boolean; // Must be true before proceeding
}

/**
 * MongoDB Document Type
 */
export interface IPreQualificationsDoc extends IPreQualifications, Document {}
