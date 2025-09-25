/**
 * CompanyCard.tsx
 *
 * Purpose:
 * - Displays a card with company details (logo, name, location, description).
 * - Handles click logic for "Apply Now" buttons, including a special case for SSP Canada (ssp-ca)
 *   where the applicant must select an application type (Flatbed/Dry Van).
 * - Uses Framer Motion for hover animations and i18n for translations.
 *
 * Props:
 * - company: Company (from constants/companies) – the company data to display.
 * - onApply: Standard "Apply Now" click handler.
 * - onSpecialApply (optional): Special "Apply Now" click handler for multi-type applications.
 */

import Image from "next/image";
import { Company } from "@/constants/companies";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ChevronsDown, ArrowRight } from "lucide-react";
import useMounted from "@/hooks/useMounted";

interface CompanyCardProps {
  company: Company;
  onApply: (company: Company) => void;
  onSpecialApply?: (company: Company) => void; // Optional: for companies with type selection
}

export default function CompanyCard({
  company,
  onApply,
  onSpecialApply,
}: CompanyCardProps) {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  /**
   * Handles "Apply Now" button click:
   * - If `ssp-ca` and onSpecialApply exists → trigger special flow (opens type selection modal).
   * - Otherwise, call standard onApply handler.
   */
  const handleClick = () => {
    if (onSpecialApply && company.id === "ssp-ca") {
      onSpecialApply(company);
    } else {
      onApply(company);
    }
  };

  // Flag to easily check if this card is SSP Canada (special application flow)
  const isSSPCA = company.id === "ssp-ca";

  // Avoid hydration mismatch issues
  if (!mounted) return null;

  return (
    <motion.div
      whileHover={{ y: -1, boxShadow: "0 8px 32px 0 rgba(0,0,0,0.10)" }}
      className="rounded-2xl shadow-md p-6 flex flex-col items-start justify-between min-h-[260px] transition-shadow duration-200"
    >
      {/* Company logo and badge */}
      <div className="flex items-center gap-3 mb-3">
        <Image
          src={company.logo}
          alt={company.name}
          width={0}
          height={0}
          sizes="40px"
          priority
          className="w-[40px] h-auto rounded-md object-contain"
        />
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${company.countryBadgeColor}`}
        >
          {company.countryCode} {company.country}
        </span>
      </div>

      {/* Company name & description */}
      <h3 className="font-bold text-lg text-gray-900 mb-1">{company.name}</h3>
      <p className="text-gray-600 text-sm mb-2">{t(`company.descriptions.${company.id}`)}</p>

      {/* Address */}
      <div className="text-xs text-gray-500 mb-4">
        <div className="font-semibold text-gray-600 mb-1">Address:</div>
        <div className="text-gray-500">{company.location}</div>
      </div>

      {/* Apply button */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        className={`mt-auto px-5 py-2 rounded-lg font-semibold text-sm shadow transition cursor-pointer flex items-center gap-2 ${company.buttonGradient} ${company.buttonTextColor}`}
        onClick={handleClick}
      >
        {t("company.applyNow")}
        {isSSPCA ? (
          // SSP Canada: show chevrons-down icon
          <motion.span
            initial={{ y: 0 }}
            whileHover={{ y: 6 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="ml-1"
          >
            <ChevronsDown size={20} />
          </motion.span>
        ) : (
          // Other companies: show arrow-right icon
          <motion.span
            initial={{ x: 0 }}
            whileHover={{ x: 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="ml-1"
          >
            <ArrowRight size={18} />
          </motion.span>
        )}
      </motion.button>
    </motion.div>
  );
}
