"use client";

import Image from "next/image";
import Link from "next/link";
import useMounted from "@/hooks/useMounted";
import { useTranslation } from "react-i18next";
import { useRouter, usePathname, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import LanguageDropdown from "@/components/LanguageDropdown";

export default function Navbar() {
  const mounted = useMounted();
  const { t } = useTranslation("common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  // ✅ Smart back navigation that preserves tracker ID
  const handleBackClick = () => {
    const trackerId = params.id as string;

    // If we're in onboarding with tracker ID, navigate to previous step
    if (trackerId && pathname.includes("/onboarding/")) {
      if (pathname.includes("/page-2")) {
        router.push(`/onboarding/${trackerId}/application-form/page-1`);
      } else if (pathname.includes("/page-1")) {
        router.push(`/onboarding/${trackerId}/prequalifications`);
      } else if (pathname.includes("/prequalifications")) {
        router.push("/start");
      } else {
        router.back(); // Fallback
      }
    } else {
      router.back(); // Fallback for other pages
    }
  };

  // Hide back button on landing page
  const showBack = pathname !== "/";
  const showLanguageDropdown = pathname !== "/" && pathname !== "/start";

  return (
    <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-md shadow-sm supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" aria-label={t("navbar.logoAlt")}>
            {mounted && (
              <Image
                src="/assets/logos/SSP-Truck-LineFullLogo.png"
                alt={t("navbar.logoAlt")}
                width={0}
                height={0}
                sizes="100vw"
                className="w-[90px] sm:w-[110px] md:w-[130px] h-auto object-contain"
                priority
              />
            )}
          </Link>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {showLanguageDropdown && <LanguageDropdown />}
          {showBack && (
            <button
              onClick={handleBackClick}
              className="ml-2 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white font-medium shadow hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-blue-300"
              aria-label={t("navbar.back", "Go Back")}
            >
              <motion.span
                initial={{ x: 0 }}
                whileHover={{ x: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <ArrowLeft size={18} />
              </motion.span>
              <span className="hidden sm:inline">
                {t("navbar.back", "Back")}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
