import "server-only";

/**
 * Resolve a repo-relative path (e.g. "src/lib/assets/safetyAdmins/signatures/signature.png")
 * into a WHATWG URL that fs.readFile accepts and Next/Vercel can trace.
 *
 * Assumes THIS file lives at: src/lib/utils/resolveFileUrl.server.ts
 * Repo root from here = "../../../" (utils -> lib -> src -> <root>)
 */
export function resolveFileUrl(repoRelativePath: string): URL {
  // Normalize to POSIX separators and strip leading "./" or "/"
  const cleaned = repoRelativePath.replace(/\\/g, "/").replace(/^(\.\/|\/)/, "");

  // IMPORTANT: don't use new URL("<literal>", import.meta.url) directly
  // It triggers Webpack's asset URL transform. Wrap import.meta.url first:
  const thisFile = new URL(import.meta.url); // file:///.../src/lib/utils/resolveFileUrl.server.ts
  const thisDir = new URL(".", thisFile); // file:///.../src/lib/utils/
  const repoRoot = new URL("../../../", thisDir); // file:///.../<repo>/

  return new URL(cleaned, repoRoot);
}
