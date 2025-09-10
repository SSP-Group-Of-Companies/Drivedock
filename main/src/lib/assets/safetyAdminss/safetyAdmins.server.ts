import "server-only";
import { fileURLToPath } from "node:url";
import { ESafetyAdminId, SAFETY_ADMINS, type SafetyAdmin } from "@/constants/safetyAdmins";

/**
 * Server-only shape: includes a real absolute filesystem path (signatureAbsPath)
 * that you can hand directly to fs.readFile(). Files are bundled because we
 * reference each PNG with a literal `new URL("./signatures/...", import.meta.url)`.
 */
export type SafetyAdminServer = SafetyAdmin & {
  /** Absolute filesystem path to the PNG (safe for fs.readFile in dev & Vercel) */
  signatureAbsPath: string;
  /** Also keep the URL around in case you prefer fs.readFile(URL) */
  signatureFileUrl: URL;
};

// Map literal file URLs so Vercel bundles them automatically
const SIGNATURE_URLS: Record<ESafetyAdminId, URL> = {
  [ESafetyAdminId.AMAN_JOSUN]: new URL("./signatures/signature-aman-josun.png", import.meta.url),
  [ESafetyAdminId.BALKARAN_DHILLON]: new URL("./signatures/signature-balkaran-dhillon.png", import.meta.url),
  [ESafetyAdminId.GURINDER_MANN]: new URL("./signatures/signature-gurinder-mann.png", import.meta.url),
  [ESafetyAdminId.KIRAN_SANDHU]: new URL("./signatures/signature-kiran-sandhu.png", import.meta.url),
};

function withServerFields(a: SafetyAdmin): SafetyAdminServer {
  const url = SIGNATURE_URLS[a.id];
  if (!url) throw new Error(`Missing signature mapping for safety admin id: ${a.id}`);
  return {
    ...a,
    signatureFileUrl: url,
    signatureAbsPath: fileURLToPath(url),
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
