/**
 * Theme Toggle Component
 * 
 * A dropdown component that allows users to switch between light, dark, and system themes.
 * Features keyboard navigation, screen reader support, and smooth animations.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useCookieThemeStore } from "@/store/useCookieThemeStore";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function ThemeToggle() {
  const { theme, setTheme } = useCookieThemeStore();
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTheme = THEMES.find(t => t.value === theme) || THEMES[2];
  const CurrentIcon = currentTheme.icon;

  const handleThemeSelect = useCallback((selectedTheme: typeof THEMES[number]["value"]) => {
    try {
      setTheme(selectedTheme);
      setOpen(false);
      setFocusedIndex(-1);
    } catch (error) {
      console.error("Failed to set theme:", error);
    }
  }, [setTheme]);

  const toggleDropdown = useCallback(() => {
    setOpen(prev => !prev);
    if (!open) {
      setFocusedIndex(-1);
    }
  }, [open]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setFocusedIndex(-1);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!open) return;

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          setOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
          break;
        case "ArrowDown":
          event.preventDefault();
          setFocusedIndex(prev => (prev + 1) % THEMES.length);
          break;
        case "ArrowUp":
          event.preventDefault();
          setFocusedIndex(prev => (prev - 1 + THEMES.length) % THEMES.length);
          break;
        case "Enter":
        case " ":
          if (focusedIndex >= 0) {
            event.preventDefault();
            handleThemeSelect(THEMES[focusedIndex].value);
          }
          break;
      }
    }

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, focusedIndex, handleThemeSelect]);

  // Focus management
  useEffect(() => {
    if (open && focusedIndex >= 0) {
      const focusableElements = dropdownRef.current?.querySelectorAll("button");
      if (focusableElements && focusableElements[focusedIndex]) {
        (focusableElements[focusedIndex] as HTMLElement).focus();
      }
    }
  }, [open, focusedIndex]);

  return (
    <div className="relative">
      <button 
        ref={buttonRef}
        onClick={toggleDropdown}
        className="flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 hover:bg-[var(--color-sidebar-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2" 
        aria-label={`Current theme: ${currentTheme.label}. Click to change theme`}
        aria-haspopup="listbox" 
        aria-expanded={open}
        aria-describedby={open ? "theme-dropdown-description" : undefined}
      >
        <CurrentIcon 
          className="w-5 h-5 transition-transform duration-200"
          style={{ color: "var(--color-on-surface)" }}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div 
          ref={dropdownRef}
          id="theme-dropdown-description"
          className="absolute right-0 top-12 mt-1 w-48 rounded-xl shadow-lg py-2 z-50 transition-all duration-200"
          style={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-outline)",
            boxShadow: "var(--color-shadow-elevated)",
          }}
          role="listbox"
          aria-label="Theme options"
        >
          {THEMES.map((themeOption, index) => {
            const Icon = themeOption.icon;
            const isActive = theme === themeOption.value;
            const isFocused = focusedIndex === index;
            
            return (
              <button
                key={themeOption.value}
                onClick={() => handleThemeSelect(themeOption.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 cursor-pointer ${
                  isActive ? "font-medium" : ""
                }`}
                style={{ 
                  color: "var(--color-on-surface)",
                  backgroundColor: isActive 
                    ? "var(--color-primary-container)" 
                    : isFocused 
                    ? "var(--color-card-hover)"
                    : "transparent",
                }}
                                 role="option"
                 aria-selected={isActive}
                 onMouseEnter={() => setFocusedIndex(index)}
                 onMouseLeave={() => setFocusedIndex(-1)}
               >
                 <Icon 
                   className="w-4 h-4 flex-shrink-0"
                   style={{ 
                     color: isActive 
                       ? "var(--color-primary)" 
                       : "var(--color-on-surface-variant)" 
                   }}
                   aria-hidden="true"
                 />
                 <span className="flex-1 text-left">{themeOption.label}</span>
                {isActive && (
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: "var(--color-primary)" }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
