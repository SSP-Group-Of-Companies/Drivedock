import Image from "next/image";
import { Company } from "@/constants/companies";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ChevronsDown, ArrowRight } from "lucide-react";
import useMounted from "@/hooks/useMounted";

interface CompanyCardProps {
  company: Company;
  onApply: (company: Company) => void;
  onSpecialApply?: (company: Company) => void; // new
}

export default function CompanyCard({
  company,
  onApply,
  onSpecialApply,
}: CompanyCardProps) {
  const mounted = useMounted();
  const { t } = useTranslation("common");
  const handleClick = () => {
    if (onSpecialApply && company.id === "ssp-ca") {
      onSpecialApply(company);
    } else {
      onApply(company);
    }
  };
  const isSSPCA = company.id === "ssp-ca";
  if (!mounted) return null;
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 32px 0 rgba(0,0,0,0.10)" }}
      className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-start justify-between min-h-[260px] transition-shadow duration-200"
    >
      <div className="flex items-center gap-3 mb-3">
        <Image
          src={company.logo}
          alt={company.name}
          width={0}
          height={0}
          sizes="40px"
          className="w-[40px] h-auto rounded-md object-contain"
        />
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${company.countryBadgeColor}`}
        >
          {company.countryCode} {company.country}
        </span>
      </div>
      <h3 className="font-bold text-lg text-gray-900 mb-1">{company.name}</h3>
      <p className="text-gray-600 text-sm mb-2">{company.description}</p>
      <div className="flex items-center text-xs text-gray-500 mb-4">
        <span>{company.location}</span>
      </div>
      <motion.button
        whileHover={isSSPCA ? { scale: 1.03 } : { scale: 1.03 }}
        className={`mt-auto px-5 py-2 rounded-lg font-semibold text-sm shadow transition flex items-center gap-2 ${company.buttonGradient} ${company.buttonTextColor}`}
        onClick={handleClick}
      >
        {t("company.applyNow")}
        {isSSPCA ? (
          <motion.span
            initial={{ y: 0 }}
            whileHover={{ y: 6 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="ml-1"
          >
            <ChevronsDown size={20} />
          </motion.span>
        ) : (
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
