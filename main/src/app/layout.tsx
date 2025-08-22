/**
 * Root Layout — DriveDock (SSP Portal)
 *
 * Description:
 * The global application layout for the DriveDock onboarding system.
 * Applies global styles, Google Fonts (Geist Sans & Mono), a background gradient,
 * and wraps the app with the `I18nProvider` for internationalization support.
 *
 * Key Components & Hooks:
 * - `next/font/google`: Loads and applies Geist Sans & Geist Mono fonts as CSS variables.
 * - `I18nProvider`: Context provider for `react-i18next` translations across the app.
 *
 * Metadata:
 * - Title: "DriveDock – Driver Onboarding"
 * - Description: "Digital onboarding for truck drivers at SSP Truck Line"
 *
 * Functionality:
 * - Adds global `<html>` and `<body>` structure for the Next.js App Router.
 * - Sets the site favicon.
 * - Applies a subtle background gradient as the lowest z-index layer.
 * - Renders children inside a `<main>` container.
 * - Watermark background is handled on a per-page basis (not in the root layout).
 *
 * Styling:
 * - Fonts applied via `geistSans.variable` and `geistMono.variable` to allow usage in Tailwind.
 * - Body has anti-aliasing, relative positioning, and hidden horizontal overflow.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import I18nProvider from "./i18n-provider";
import PageTransitionWrapper from "@/components/shared/PageTransitionWrapper";
import GlobalLayoutWrapper from "@/components/shared/GlobalLayoutWrapper";

// Load Google Fonts as CSS variables
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Page metadata for SEO
export const metadata: Metadata = {
  title: "DriveDock – Driver Onboarding",
  description: "Digital onboarding for truck drivers at SSP Truck Line",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon */}
        <link
          rel="icon"
          href="/assets/logos/blackFavicon.png"
          type="image/png"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative min-h-screen overflow-x-hidden bg-white text-gray-900`}
        suppressHydrationWarning
      >
        <I18nProvider>
          {/* Background Gradient Layer */}
          <div className="absolute inset-0 z-[-2] bg-gradient-to-br from-white via-blue-100 to-blue-600 opacity-40" />

          {/* Star Watermark is now handled per-page */}

          {/* Main Content Area with Smooth Transitions and Global Loading */}
          <GlobalLayoutWrapper>
            <PageTransitionWrapper>
              <main className="relative z-10">{children}</main>
            </PageTransitionWrapper>
          </GlobalLayoutWrapper>
        </I18nProvider>
      </body>
    </html>
  );
}
