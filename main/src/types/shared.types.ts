export interface IPhoto {
  url: string;
  s3Key: string;
}

export enum ELicenseType {
  G1 = "G1",
  G2 = "G2",
  G = "G",
  M1 = "M1",
  M2 = "M2",
  M = "M",
  D = "D",
  A = "A",
  A_R = "A_R",
  B = "B",
  C = "C",
  E = "E",
  F = "F",
  AZ = "AZ",
  Other = "Other",
}

export enum ECountryCode {
  CA = "CA",
  US = "US",
}

export enum EImageMimeType {
  JPEG = "image/jpeg",
  JPG = "image/jpg",
  PNG = "image/png",
}

export enum EImageExtension {
  JPG = "jpg",
  JPEG = "jpeg",
  PNG = "png",
}
