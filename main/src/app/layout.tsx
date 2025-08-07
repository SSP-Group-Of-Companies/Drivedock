// Root layout for SSPPortal App
// Applies global styles, fonts (Geist Sans & Mono), background gradient & watermark

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import I18nProvider from "./i18n-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        <link
          rel="icon"
          href="/assets/logos/blackFavicon.png"
          type="image/png"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative min-h-screen overflow-x-hidden bg-white text-gray-900`}
      >
        <I18nProvider>
          {/* Background Gradient Layer */}
          <div className="absolute inset-0 z-[-2] bg-gradient-to-br from-white via-blue-100 to-blue-600 opacity-40" />

          {/* Star Watermark */}
          {/* Watermark is now handled per-page */}

          {/* Main Content */}
          <main className="relative z-10">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
