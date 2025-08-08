/**
 * Language Selector Component — DriveDock
 *
 * Description:
 * A dropdown component that allows users to select their preferred language
 * for the onboarding process. Displays available languages with flags and labels,
 * and updates the global language state on selection.
 *
 * Key Components & Hooks:
 * - `useLanguageStore`: Zustand store for managing and updating the current language.
 * - `LANGUAGES`: Constant list of supported languages with labels, codes, and styles.
 * - `useMounted`: Prevents hydration mismatches by only rendering after client mount.
 * - `framer-motion` + `AnimatePresence`: Animates dropdown open/close transitions.
 * - `clsx`: Utility for conditional class names.
 * - `useTranslation`: Provides multilingual accessibility label for the button.
 *
 * Functionality:
 * - Opens automatically on mount with a "flash" animated ring for onboarding guidance.
 * - Closes when clicking outside the dropdown.
 * - Displays a list of languages excluding the currently selected one.
 * - Updates the global language store and closes the dropdown when a new language is selected.
 * - Shows a check icon next to the active language when reopened.
 *
 * Routing:
 * This component is typically used on `/start` or onboarding intro pages,
 * but can be reused anywhere language selection is needed.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { useLanguageStore } from "@/hooks/useLanguageStore";
import { ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

//component, hooks & constants
import { LANGUAGES } from "@/constants/languages";
import useMounted from "@/hooks/useMounted";

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguageStore();
  const [isOpen, setIsOpen] = useState(false);
  const [flash, setFlash] = useState(false); // Controls animated border on mount
  const selectorRef = useRef<HTMLDivElement>(null);

  const mounted = useMounted();
  const { t } = useTranslation("common");

  const selectedLang =
    LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  // Open dropdown on mount with animated border
  useEffect(() => {
    setIsOpen(true);
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Close dropdown if clicking outside of the component
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) return null;

  return (
    <div ref={selectorRef} className="relative w-full max-w-md mx-auto">
      {/* Outer wrapper with optional flashing animated ring */}
      <div
        className={clsx(
          "ssp-ring-wrapper rounded-xl p-[6px] transition-all duration-300",
          flash ? "ssp-animated-ring" : ""
        )}
      >
        <div className="bg-white rounded-[0.625rem] overflow-hidden shadow-md">
          {/* Language selection button */}
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 focus:outline-none"
            aria-label={t("start.selectLanguage")}
          >
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full ${selectedLang.flagStyle}`}
                />
                <span>{selectedLang.label}</span>
              </span>
            </span>
            <ChevronDown size={18} className="text-gray-500" />
          </button>

          {/* Dropdown list */}
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
                      <span
                        className={`w-5 h-5 rounded-full ${lang.flagStyle}`}
                      />
                      <span>
                        {lang.label}
                        {lang.code !== "en" && (
                          <span className="text-gray-500 ml-1 text-xs">
                            ({lang.english})
                          </span>
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
