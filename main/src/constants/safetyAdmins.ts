// src/lib/assets/safetyAdmins/safetyAdminsignature-s.ts

export enum ESafetyAdminId {
  AMAN_JOSUN = "aman_josun",
  BALKARAN_DHILLON = "balkaran_dhillon",
  GURINDER_MANN = "gurinder_mann",
  KIRAN_SANDHU = "kiran_sandhu",
}

export interface SafetyAdmin {
  id: ESafetyAdminId;
  name: string;
  signature: string; // path to signature image in lib/assets/safetyAdmins/signatures
}

export const SAFETY_ADMINS: SafetyAdmin[] = [
  {
    id: ESafetyAdminId.AMAN_JOSUN,
    name: "Aman Josun",
    signature: "lib/assets/safetyAdmins/signatures/signature-aman-josun.png",
  },
  {
    id: ESafetyAdminId.BALKARAN_DHILLON,
    name: "Balkaran Dhillon",
    signature: "lib/assets/safetyAdmins/signatures/signature-balkaran-dhillon.png",
  },
  {
    id: ESafetyAdminId.GURINDER_MANN,
    name: "Gurinder Mann",
    signature: "lib/assets/safetyAdmins/signatures/signature-gurinder-mann.png",
  },
  {
    id: ESafetyAdminId.KIRAN_SANDHU,
    name: "kiran Sandhu",
    signature: "lib/assets/safetyAdmins/signatures/signature-kiran-sandhu.png",
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
