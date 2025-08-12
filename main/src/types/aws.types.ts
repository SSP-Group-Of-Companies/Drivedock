import { EImageMimeType } from "./shared.types";

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
}

export interface IPresignRequest {
  folder: ES3Folder;
  filename: string;
  mimetype: EImageMimeType;
  trackerId?: string;
  filesize?: number;
}

export interface IPresignResponse {
  key: string; // The S3 object key
  url: string; // Presigned PUT URL
  publicUrl: string; // Public GET URL (derived from key)
  expiresIn: number;
}
