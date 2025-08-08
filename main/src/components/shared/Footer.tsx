/**
 * Footer Component — DriveDock
 *
 * Description:
 * A simple footer displayed across public-facing pages in the DriveDock application.
 * Shows company copyright and a short tagline, with multilingual support.
 *
 * Key Components & Hooks:
 * - `useMounted`: Prevents hydration mismatch by rendering only after client mount.
 * - `useTranslation`: Fetches multilingual strings for footer text from `common.json`.
 *
 * Functionality:
 * - Displays:
 *   1. Company copyright.
 *   2. Translated "All rights reserved" text.
 *   3. Translated tagline below.
 * - Styled with a dark background and centered text.
 *
 * Routing:
 * This component is typically used on the landing page (`/`) and start pages,
 * but can be reused in other public views as needed.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

import { useTranslation } from "react-i18next";
import useMounted from "@/hooks/useMounted";

export default function Footer() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) return null;

  return (
    <footer className="w-full bg-gray-900 text-gray-400 py-3">
      <div className="max-w-4xl mx-auto px-4 text-center text-sm">
        {/* Company name and rights notice */}
        <p className="font-medium text-white">
          © 2025 SSP Group of Companies. {t("footer.rights")}
        </p>
        {/* Tagline */}
        <p className="mt-1">{t("footer.tagline")}</p>
      </div>
    </footer>
  );
}
