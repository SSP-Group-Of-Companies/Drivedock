/**
 * Page Transition Wrapper Component — DriveDock (SSP Portal)
 *
 * Description:
 * Wrapper component that provides smooth page transitions across the application.
 * Uses Framer Motion to animate page changes with a simple fade-in effect.
 * Applied at the root layout level to handle all navigation transitions.
 *
 * Features:
 * - Smooth fade-in transitions between pages
 * - Automatic pathname-based key management
 * - Fast, subtle animation (0.1s) to prevent white screen flicker
 * - Prevents jarring page jumps during navigation
 *
 * Author: Faruq Adebayo Atanda
 * Company: SSP Group of Companies
 * Created: 2025-01-27
 */

"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface PageTransitionWrapperProps {
  children: ReactNode;
}

export default function PageTransitionWrapper({ children }: PageTransitionWrapperProps) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.15,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}
