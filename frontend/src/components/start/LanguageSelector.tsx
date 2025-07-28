"use client";

import { useEffect, useState, useRef } from "react";
import { LANGUAGES } from "@/constants/languages";
import { useLanguageStore } from "@/hooks/useLanguageStore";
import { ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import useMounted from "@/hooks/useMounted"; //  Custom hook
import { useTranslation } from "react-i18next";

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguageStore();
  const [isOpen, setIsOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  const { t } = useTranslation("common");

  const selectedLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  // Open dropdown and trigger border animation
  useEffect(() => {
    setIsOpen(true);
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) return null; // ✅ Prevent hydration mismatch

  return (
    <div ref={selectorRef} className="relative w-full max-w-md mx-auto">
      {/* Animated ring container */}
      <div
        className={clsx(
          "ssp-ring-wrapper rounded-xl p-[6px] transition-all duration-300",
          flash ? "ssp-animated-ring" : ""
        )}
      >
        <div className="bg-white rounded-[0.625rem] overflow-hidden shadow-md">
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 focus:outline-none"
            aria-label={t("start.selectLanguage")} // Optional a11y translation
          >
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full ${selectedLang.flagStyle}`} />
                <span>{selectedLang.label}</span>
              </span>
            </span>
            <ChevronDown size={18} className="text-gray-500" />
          </button>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.ul
                key="dropdown"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-gray-800 divide-y divide-gray-100"
              >
                {LANGUAGES.filter((l) => l.code !== language).map((lang) => (
                  <li
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-blue-50",
                      lang.code === language ? "bg-blue-100 font-medium" : ""
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full ${lang.flagStyle}`} />
                      <span>
                        {lang.label}
                        {lang.code !== "en" && (
                          <span className="text-gray-500 ml-1 text-xs">({lang.english})</span>
                        )}
                      </span>
                    </span>
                    {lang.code === language && (
                      <Check size={16} className="ml-auto text-blue-600" />
                    )}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
