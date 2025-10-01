"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import CompanyLogoHeader from "@/components/shared/CompanyLogoHeader";
import LanguageDropdown from "@/components/shared/LanguageDropdown";

export default function DefaultOnboardingShell({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Full navbar (hidden when scrolled) */}
      <div className={isScrolled ? "hidden" : "block"}>
        <Navbar />
      </div>

      {/* Compact sticky header on scroll */}
      <AnimatePresence>
        {isScrolled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
              {/* Desktop */}
              <div className="hidden md:flex items-center justify-between w-full">
                <div className="flex items-center h-full">
                  <CompanyLogoHeader logoOnly />
                </div>
                <div className="flex items-center gap-2 ml-auto h-full">
                  <LanguageDropdown />
                </div>
              </div>

              {/* Mobile */}
              <div className="md:hidden w-full">
                <div className="flex items-center justify-between">
                  <CompanyLogoHeader logoOnly />
                  <LanguageDropdown />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main body with the same background gradient used elsewhere */}
      <main className="flex-1 relative bg-gradient-to-b from-slate-50 via-sky-100 to-sky-200 px-4 py-8 sm:px-8 flex items-center justify-center">{children}</main>

      <Footer />
    </div>
  );
}
