/**
 * Language Dropdown Component — DriveDock
 *
 * Description:
 * A compact dropdown used in the navbar for switching between supported application languages.
 * Displays all available language flags in the toggle button, with the active language highlighted.
 *
 * Key Components & Hooks:
 * - `useLanguageStore`: Zustand store for getting/setting the current language.
 * - `LANGUAGES`: Constant array defining available languages with codes, labels, and flag styles.
 * - `framer-motion` `AnimatePresence` + `motion.ul`: Animates dropdown open/close transitions.
 * - `clsx`: Utility for conditional class names.
 *
 * Functionality:
 * - Shows all language flags in the toggle button, highlighting the active one with a blue ring.
 * - Opens/closes the dropdown when the button is clicked.
 * - Closes automatically when clicking outside the dropdown.
 * - Displays a selectable list of languages with flags and labels in the dropdown.
 * - Updates global language state (`setLanguage`) on selection and closes dropdown.
 *
 * Accessibility:
 * - Toggle button has `aria-label="Change language"` for screen reader users.
 *
 * Routing:
 * - Typically used in the onboarding `Navbar` except on `/` and `/start`.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

import { useState, useRef, useEffect } from "react";
import { LANGUAGES } from "@/constants/languages";
import { useLanguageStore } from "@/hooks/useLanguageStore";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export default function LanguageDropdown() {
  const { language, setLanguage } = useLanguageStore();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative flex items-center">
      {/* Toggle button showing all flags + chevron */}
      <button
        className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 shadow border border-gray-200 hover:bg-blue-50 transition"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
      >
        {LANGUAGES.map((lang) => (
          <span
            key={lang.code}
            className={clsx(
              "w-6 h-6 rounded-full border-2 border-white shadow-sm mx-[-2px]",
              lang.code === language ? "ring-2 ring-blue-500" : "",
              lang.flagStyle
            )}
          />
        ))}
        <ChevronDown size={18} className="ml-1 text-blue-700" />
      </button>

      {/* Animated dropdown list */}
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-2"
          >
            {LANGUAGES.map((lang) => (
              <li
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setOpen(false);
                }}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-blue-50 text-sm",
                  lang.code === language ? "bg-blue-100 font-semibold" : ""
                )}
              >
                <span
                  className={clsx("w-5 h-5 rounded-full", lang.flagStyle)}
                />
                <span>{lang.label}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
