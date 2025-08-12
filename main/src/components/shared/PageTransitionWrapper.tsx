/**
 * Page Transition Wrapper Component — DriveDock (SSP Portal)
 *
 * Description:
 * Wrapper component that provides smooth page transitions across the application.
 * Uses Framer Motion to animate page changes with a simple fade-in/fade-out effect.
 * Applied at the root layout level to handle all navigation transitions.
 *
 * Features:
 * - Smooth fade transitions between pages
 * - Automatic pathname-based key management
 * - Consistent animation timing across the app
 * - Prevents jarring page jumps during navigation
 *
 * Author: Faruq Adebayo Atanda
 * Company: SSP Group of Companies
 * Created: 2025-01-27
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface PageTransitionWrapperProps {
  children: ReactNode;
}

export default function PageTransitionWrapper({ children }: PageTransitionWrapperProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.2,
          ease: "easeInOut",
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
