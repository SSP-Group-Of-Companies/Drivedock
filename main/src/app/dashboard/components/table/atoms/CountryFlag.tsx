"use client";

import Image from "next/image";
import {
  flagSrcFor,
  resolveCompanyMeta,
} from "@/constants/dashboard/companies";

type Props = Readonly<{
  companyId?: string;
  /** visual size of the flag */
  size?: "xs" | "sm" | "md";
  className?: string;
}>;

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-3 w-4", // ~12x16
  sm: "h-3.5 w-5", // ~14x20 (your current default)
  md: "h-4 w-6", // ~16x24
};

const COUNTRY_NAME: Record<string, string> = {
  US: "United States",
  CA: "Canada",
};

export default function CountryFlag({
  companyId,
  size = "sm",
  className,
}: Props) {
  const { countryCode } = resolveCompanyMeta(companyId);
  const src = flagSrcFor(countryCode);
  const label = COUNTRY_NAME[countryCode ?? ""] ?? "Country";

  return (
    <span
      className={`relative overflow-hidden  ${SIZE[size]} ${className ?? ""}`}
      // keep styling aligned with the rest of the dashboard tokens
      style={{ border: "1px solid var(--color-outline)" }}
      title={`${label} flag`}
      aria-label={`${label} flag`}
    >
      {src ? (
        <Image
          src={src}
          alt={`${label} flag`}
          fill
          sizes={size === "md" ? "24px" : size === "sm" ? "20px" : "16px"}
          className="object-cover"
          priority={false}
        />
      ) : (
        // graceful fallback if a code/logo is missing
        <span
          className="block h-full w-full"
          style={{ backgroundColor: "var(--color-outline-variant)" }}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
