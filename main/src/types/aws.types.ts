// src/types/aws.types.ts
import { EFileMimeType } from "./shared.types";

export enum ES3Folder {
  LICENSES = "licenses",
  HEALTH_CARD_PHOTOS = "health-card-photos",
  PASSPORT_PHOTOS = "passport-photos",
  PR_CITIZENSHIP_PHOTOS = "pr-citizenship-photos",
  INCORPORATION_PHOTOS = "incorporation-photos",
  HST_PHOTOS = "hst-photos",
  BANKING_INFO_PHOTOS = "banking-info-photos",
  US_VISA_PHOTOS = "us-visa-photos",
  SIN_PHOTOS = "sin-photos",
  SIGNATURES = "signatures",
  MEDICAL_CERT_PHOTOS = "medical-cert-photos",
  FAST_CARD_PHOTOS = "fast-card-photos",
  DRUG_TEST_DOCS = "drug-test-docs",
  CARRIERS_EDGE_CERTIFICATES = "carriers-edge-certificates",
  DRIVE_TEST = "drive-test",
  FLATBED_TRAINING_CERTIFICATES = "flatbed-training-certificates",
}

export interface IPresignRequest {
  folder: ES3Folder;
  filename?: string;
  mimeType: EFileMimeType;
  trackerId?: string;
  filesize?: number;
}

export interface IPresignResponse {
  key: string;
  url: string;
  publicUrl: string;
  expiresIn: number;
  mimeType: EFileMimeType;
}
