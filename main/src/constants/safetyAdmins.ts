// src/lib/assets/safetyAdmins/safetyAdminsignature-s.ts

export enum ESafetyAdminId {
  AVERY_COLLINS = "avery-collins",
  JORDAN_LEE = "jordan-lee",
  PRIYA_PATEL = "priya-patel",
  MIGUEL_ALVAREZ = "miguel-alvarez",
  CHEN_WU = "chen-wu",
}

export interface SafetyAdmin {
  id: ESafetyAdminId;
  name: string;
  signature: string; // path to signature image in lib/assets/safetyAdmins/signatures
}

export const SAFETY_ADMINS: SafetyAdmin[] = [
  {
    id: ESafetyAdminId.AVERY_COLLINS,
    name: "Avery Collins",
    signature: "lib/assets/safetyAdmins/signatures/signature-avery-collins.png",
  },
  {
    id: ESafetyAdminId.JORDAN_LEE,
    name: "Jordan Lee",
    signature: "lib/assets/safetyAdmins/signatures/signature-jordan-lee.png",
  },
  {
    id: ESafetyAdminId.PRIYA_PATEL,
    name: "Priya Patel",
    signature: "lib/assets/safetyAdmins/signatures/signature-priya-patel.png",
  },
  {
    id: ESafetyAdminId.MIGUEL_ALVAREZ,
    name: "Miguel Alvarez",
    signature: "lib/assets/safetyAdmins/signatures/signature-miguel-alvarez.png",
  },
  {
    id: ESafetyAdminId.CHEN_WU,
    name: "Chen Wu",
    signature: "lib/assets/safetyAdmins/signatures/signature-chen-wu.png",
  },
];

// --- Helpers ---

export function listSafetyAdmins(): SafetyAdmin[] {
  return SAFETY_ADMINS;
}

export function getSafetyAdminById(id: ESafetyAdminId): SafetyAdmin | undefined {
  return SAFETY_ADMINS.find((admin) => admin.id === id);
}

export function findSafetyAdminByName(name: string): SafetyAdmin | undefined {
  return SAFETY_ADMINS.find((admin) => admin.name.toLowerCase() === name.toLowerCase());
}

export function getSignaturePathById(id: ESafetyAdminId): string | null {
  const admin = getSafetyAdminById(id);
  return admin ? admin.signature : null;
}

export function getSignaturePathByName(name: string): string | null {
  const admin = findSafetyAdminByName(name);
  return admin ? admin.signature : null;
}
