/**
 * Dashboard Skeleton Component — DriveDock
 *
 * Description:
 * Provides smooth loading states for dashboard pages to prevent layout shifts
 * and flickers during data fetching and page transitions.
 *
 * Features:
 * - Responsive skeleton layout matching dashboard structure
 * - Theme-aware colors
 * - Smooth animations
 * - Prevents layout shifts
 */

"use client";

import { motion } from "framer-motion";

interface DashboardSkeletonProps {
  variant?: "home" | "contract";
  showSidebar?: boolean;
}

export default function DashboardSkeleton({ 
  variant = "home", 
  showSidebar = true 
}: DashboardSkeletonProps) {
  const isContract = variant === "contract";

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Skeleton */}
      <div 
        className="h-12 sm:h-14 border-b"
        style={{ 
          backgroundColor: "var(--color-header)",
          borderColor: "var(--color-header-border)"
        }}
      >
        <div className="flex items-center justify-between h-full px-3 sm:px-4">
          {/* Left: Menu button skeleton */}
          <div className="flex items-center">
            <motion.div
              className="w-11 h-11 sm:w-10 sm:h-10 rounded-full"
              style={{ backgroundColor: "var(--color-sidebar)" }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>

          {/* Center: Logo skeleton */}
          <motion.div
            className="w-24 sm:w-28 md:w-32 lg:w-40 h-6 sm:h-7 md:h-8 bg-gray-200 dark:bg-gray-700 rounded"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />

          {/* Right: Actions skeleton */}
          <div className="flex items-center gap-2">
            <motion.div
              className="w-8 h-8 rounded-full"
              style={{ backgroundColor: "var(--color-sidebar)" }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-8 h-8 rounded-full"
              style={{ backgroundColor: "var(--color-sidebar)" }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar Skeleton */}
        {showSidebar && (
          <div className="hidden xl:block shrink-0 w-56 lg:w-64">
            <div 
              className="h-full pl-3 pr-0 py-4"
              style={{ backgroundColor: "var(--color-card)" }}
            >
              <div className="space-y-4">
                {/* Navigation section */}
                <div>
                  <motion.div
                    className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <div className="space-y-1">
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ 
                          duration: 1.5, 
                          repeat: Infinity, 
                          delay: i * 0.1 
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Contract sections */}
                {isContract && (
                  <>
                    {[1, 2, 3].map((section) => (
                      <div key={section}>
                        <motion.div
                          className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity, 
                            delay: section * 0.2 
                          }}
                        />
                        <div className="space-y-1">
                          {[1, 2, 3].map((item) => (
                            <motion.div
                              key={item}
                              className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"
                              animate={{ opacity: [0.6, 1, 0.6] }}
                              transition={{ 
                                duration: 1.5, 
                                repeat: Infinity, 
                                delay: (section * 0.2) + (item * 0.1) 
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Skeleton */}
        <main 
          className="min-w-0 flex-1"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 pt-4 pb-8">
            {/* Page Header */}
            <div className="mb-6">
              <motion.div
                className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
            </div>

            {/* Content Grid */}
            {isContract ? (
              // Contract page skeleton
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((card) => (
                  <motion.div
                    key={card}
                    className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      delay: card * 0.1 
                    }}
                  />
                ))}
              </div>
            ) : (
              // Home page skeleton
              <div className="space-y-6">
                {/* Stats cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((card) => (
                    <motion.div
                      key={card}
                      className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        delay: card * 0.1 
                      }}
                    />
                  ))}
                </div>

                {/* Data table */}
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4">
                  <motion.div
                    className="h-6 w-32 bg-gray-300 dark:bg-gray-600 rounded mb-4"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((row) => (
                      <motion.div
                        key={row}
                        className="h-12 bg-gray-300 dark:bg-gray-600 rounded"
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ 
                          duration: 1.5, 
                          repeat: Infinity, 
                          delay: row * 0.1 
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
