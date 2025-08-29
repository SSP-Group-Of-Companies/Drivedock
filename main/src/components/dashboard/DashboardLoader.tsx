/**
 * Dashboard Loading Screen Component — DriveDock (SSP Portal)
 *
 * Description:
 * Dashboard-specific loading overlay with animated SSP star logo and subtle particles.
 * Provides visual feedback during async operations like form submissions,
 * navigation, and API calls. Uses Framer Motion for smooth animations.
 * Fully theme-aware with light/dark mode support.
 *
 * Features:
 * - Animated star with breathing effect and radial color reveal
 * - Subtle particle animations for visual interest
 * - Backdrop blur for focus
 * - Responsive design with professional animations
 * - Full theme-aware colors (light/dark mode)
 *
 * Author: Faruq Adebayo Atanda
 * Company: SSP Group of Companies
 * Created: 2025-01-27
 */

"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboardLoading } from "@/store/useDashboardLoading";

export default function DashboardLoader() {
  const { visible, message } = useDashboardLoading();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-sm transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-background)',
            opacity: 0.7
          }}
        >
          <div className="flex flex-col items-center gap-3">
            {/* Animated SSP star with breathing effect and particles */}
            <div className="relative w-32 h-32">
              {/* Background glow effect */}
              <motion.div
                className="absolute inset-0 rounded-full blur-xl"
                style={{
                  background: `linear-gradient(to right, var(--color-primary), var(--color-secondary))`,
                  opacity: 0.2
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Main star container with breathing animation */}
              <motion.div
                className="relative w-full h-full"
                animate={{
                  scale: [0.95, 1.05, 0.95],
                  rotate: [-1, 1, -1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {/* Base star (muted/desaturated) */}
                <Image
                  src="/assets/logos/favicon.png"
                  alt="Loading"
                  fill
                  className="object-contain opacity-30 saturate-50"
                  priority
                />
                {/* Animated color reveal overlay */}
                <div className="absolute inset-0 origin-center animate-star-reveal-radial">
                  <Image
                    src="/assets/logos/favicon.png"
                    alt="Loading"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </motion.div>

              {/* Floating particles around the star */}
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.span
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    backgroundColor: 'var(--color-secondary)',
                    opacity: 0.4,
                    width: 3 + (i % 2) * 2,
                    height: 3 + (i % 2) * 2,
                    left: `${20 + ((i * 15) % 60)}%`,
                    top: `${15 + ((i * 20) % 70)}%`,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatDelay: 0.5,
                    delay: i * 0.3,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            {/* Optional loading message */}
            {message && (
              <p 
                className="text-sm animate-pulse"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                {message}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
