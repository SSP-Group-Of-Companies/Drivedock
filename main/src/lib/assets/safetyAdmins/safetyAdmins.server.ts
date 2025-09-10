import "server-only";
import path from "node:path";
import { ESafetyAdminId, SAFETY_ADMINS, type SafetyAdmin } from "@/constants/safetyAdmins";

/**
 * Server-only shape: includes a real absolute filesystem path (signatureAbsPath)
 * that you can hand directly to fs.readFile(). Files are bundled because we
 * reference each PNG with a literal relative path.
 */
export type SafetyAdminServer = SafetyAdmin & {
  /** Absolute filesystem path to the PNG (safe for fs.readFile in dev & Vercel) */
  signatureAbsPath: string;
};

const SIGNATURE_PATHS: Record<ESafetyAdminId, string> = {
  [ESafetyAdminId.AMAN_JOSUN]: path.join(process.cwd(), "src/lib/safetyAdmins/signatures/signature-aman-josun.png"),
  [ESafetyAdminId.BALKARAN_DHILLON]: path.join(process.cwd(), "src/lib/safetyAdmins/signatures/signature-balkaran-dhillon.png"),
  [ESafetyAdminId.GURINDER_MANN]: path.join(process.cwd(), "src/lib/safetyAdmins/signatures/signature-gurinder-mann.png"),
  [ESafetyAdminId.KIRAN_SANDHU]: path.join(process.cwd(), "src/lib/safetyAdmins/signatures/signature-kiran-sandhu.png"),
};

function withServerFields(a: SafetyAdmin): SafetyAdminServer {
  const absPath = SIGNATURE_PATHS[a.id];
  if (!absPath) throw new Error(`Missing signature mapping for safety admin id: ${a.id}`);
  return {
    ...a,
    signatureAbsPath: absPath,
  };
}

/** Get ONE server-ready admin (preferred for routes) */
export function getSafetyAdminServerById(id: ESafetyAdminId): SafetyAdminServer | undefined {
  const base = SAFETY_ADMINS.find((x) => x.id === id);
  return base ? withServerFields(base) : undefined;
}

/** Get ALL server-ready admins (handy for admin UIs) */
export function listSafetyAdminsServer(): SafetyAdminServer[] {
  return SAFETY_ADMINS.map(withServerFields);
}
