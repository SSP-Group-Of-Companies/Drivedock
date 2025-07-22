"use client";

import Image from "next/image";
import Link from "next/link";
import useMounted from "@/hooks/useMounted";
import { useTranslation } from "react-i18next";

export default function Navbar() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

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
                width={130}
                height={40}
                className="w-[90px] sm:w-[110px] md:w-[130px] h-auto object-contain"
                priority
              />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
