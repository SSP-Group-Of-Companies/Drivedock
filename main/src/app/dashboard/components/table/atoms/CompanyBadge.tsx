"use client";

import Image from "next/image";
import { resolveCompanyMeta } from "@/constants/dashboard/companies";

type Props = Readonly<{
  companyId?: string;
  /** Show the text label at all? (keeps SR label even when false) */
  showLabel?: boolean;
  /** Hide the text label on small screens only */
  hideLabelOnMobile?: boolean;
  /** Optional size preset for the logo square */
  size?: "sm" | "md" | "lg" | "xl";
  /** Allow parent to pass layout tweaks */
  className?: string;
}>;

const SIZE_CLASS: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-5 w-5 sm:h-6 sm:w-6",
  md: "h-6 w-6 sm:h-7 sm:w-7",
  lg: "h-7 w-7 sm:h-8 sm:w-8",
  xl: "h-9 w-9 sm:h-10 sm:w-10",
};

export default function CompanyBadge({
  companyId,
  showLabel = true,
  hideLabelOnMobile = false,
  size = "lg",
  className,
}: Props) {
  const meta = resolveCompanyMeta(companyId); // must return { label, logoSrc }
  const labelIsHiddenVisually = hideLabelOnMobile
    ? "hidden sm:inline"
    : "inline";

  return (
    <span
      className={`inline-flex items-center gap-2 min-w-0 ${className ?? ""}`}
      title={meta.label}
      aria-label={!showLabel ? meta.label : undefined} // keep accessible name if text is hidden
    >
      <span
        className={`relative overflow-hidden rounded ${SIZE_CLASS[size]}`}
        style={{ backgroundColor: "var(--color-surface)" }}
        aria-hidden="true"
      >
        <Image
          src={meta.logoSrc}
          alt="" // decorative; name provided on wrapper
          fill
          sizes={
            size === "sm"
              ? "20px"
              : size === "md"
              ? "24px"
              : size === "lg"
              ? "32px"
              : "40px"
          }
          className="object-contain"
          priority={false}
        />
      </span>

      {showLabel ? (
        <span
          className={`${labelIsHiddenVisually} truncate text-sm`}
          style={{ color: "var(--color-on-surface)" }}
        >
          {meta.label}
        </span>
      ) : (
        // SR-only label when showLabel={false}
        <span className="sr-only">{meta.label}</span>
      )}
    </span>
  );
}
