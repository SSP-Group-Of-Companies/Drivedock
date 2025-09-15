export enum ESafetyAdminId {
  AMAN_JOSUN = "aman_josun",
  BALKARAN_DHILLON = "balkaran_dhillon",
  GURINDER_MANN = "gurinder_mann",
  KIRAN_SANDHU = "kiran_sandhu",
}

export interface SafetyAdmin {
  id: ESafetyAdminId;
  name: string;
  /** (optional) legacy; don't use for server file I/O */
  signature?: string;
}

export const SAFETY_ADMINS: SafetyAdmin[] = [
  { id: ESafetyAdminId.AMAN_JOSUN, name: "Aman Josun" },
  { id: ESafetyAdminId.BALKARAN_DHILLON, name: "Balkaran Dhillon" },
  { id: ESafetyAdminId.GURINDER_MANN, name: "Gurinder Mann" },
  { id: ESafetyAdminId.KIRAN_SANDHU, name: "Kiran Sandhu" },
];

export function listSafetyAdmins(): SafetyAdmin[] {
  return SAFETY_ADMINS;
}

export function getSafetyAdminById(id: ESafetyAdminId): SafetyAdmin | undefined {
  return SAFETY_ADMINS.find((a) => a.id === id);
}
