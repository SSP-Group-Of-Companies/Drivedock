"use client";

import { useThemeStore } from "@/store/useThemeStore";
import { Moon, Sun, Monitor, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: 'var(--color-primary-container)' }}
        >
          <SettingsIcon 
            className="w-6 h-6" 
            style={{ color: 'var(--color-primary)' }}
          />
        </div>
        <div>
          <h1 
            className="text-2xl font-bold"
            style={{ color: 'var(--color-on-surface)' }}
          >
            Settings
          </h1>
          <p style={{ color: 'var(--color-on-surface-variant)' }}>
            Manage your application preferences
          </p>
        </div>
      </div>

       {/* About Section */}
       <div 
        className="rounded-2xl shadow-sm border p-6"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-outline)'
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4"
          style={{ color: 'var(--color-on-surface)' }}
        >
          About DriveDock
        </h3>
        <div className="space-y-3 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
          <p>
            DriveDock is the digital onboarding platform for SSP Truck Line, designed to streamline
            the driver application process with a modern, accessible interface.
          </p>
          <p>
            Built with Next.js, TypeScript, and Tailwind CSS, following modern web standards
            and accessibility guidelines.
          </p>
          <div className="pt-2">
            <span className="text-xs">Version 1.0.0</span>
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div 
        className="rounded-2xl shadow-sm border p-6"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-outline)'
        }}
      >
        <h2 
          className="text-lg font-semibold mb-4"
          style={{ color: 'var(--color-on-surface)' }}
        >
          Appearance
        </h2>
        
        <div className="space-y-4">
          <p 
            className="text-sm"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            Choose your preferred theme for the application interface.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Light Mode */}
            <button
              onClick={() => setTheme("light")}
              className="p-4 rounded-xl border-2 transition-all duration-200"
              style={{
                borderColor: theme === "light" ? 'var(--color-primary)' : 'var(--color-outline)',
                backgroundColor: theme === "light" ? 'var(--color-primary-container)' : 'transparent'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Sun className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="text-left">
                  <div 
                    className="font-medium"
                    style={{ color: 'var(--color-on-surface)' }}
                  >
                    Light
                  </div>
                  <div 
                    className="text-xs"
                    style={{ color: 'var(--color-on-surface-variant)' }}
                  >
                    Clean and bright
                  </div>
                </div>
              </div>
            </button>

            {/* Dark Mode */}
            <button
              onClick={() => setTheme("dark")}
              className="p-4 rounded-xl border-2 transition-all duration-200"
              style={{
                borderColor: theme === "dark" ? 'var(--color-primary)' : 'var(--color-outline)',
                backgroundColor: theme === "dark" ? 'var(--color-primary-container)' : 'transparent'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-800">
                  <Moon className="w-5 h-5 text-gray-300" />
                </div>
                <div className="text-left">
                  <div 
                    className="font-medium"
                    style={{ color: 'var(--color-on-surface)' }}
                  >
                    Dark
                  </div>
                  <div 
                    className="text-xs"
                    style={{ color: 'var(--color-on-surface-variant)' }}
                  >
                    Easy on the eyes
                  </div>
                </div>
              </div>
            </button>

            {/* System */}
            <button
              onClick={() => setTheme("system")}
              className="p-4 rounded-xl border-2 transition-all duration-200"
              style={{
                borderColor: theme === "system" ? 'var(--color-primary)' : 'var(--color-outline)',
                backgroundColor: theme === "system" ? 'var(--color-primary-container)' : 'transparent'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <Monitor className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left">
                  <div 
                    className="font-medium"
                    style={{ color: 'var(--color-on-surface)' }}
                  >
                    System
                  </div>
                  <div 
                    className="text-xs"
                    style={{ color: 'var(--color-on-surface-variant)' }}
                  >
                    Follows your OS
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
