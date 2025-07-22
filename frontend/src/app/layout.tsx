// Root layout for SSPPortal App
// Applies global styles, fonts (Geist Sans & Mono), background gradient & watermark

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative min-h-screen overflow-x-hidden bg-white text-gray-900`}
      >
        <I18nProvider>
        {/* Background Gradient Layer */}
        <div className="absolute inset-0 z-[-2] bg-gradient-to-br from-white via-blue-100 to-blue-600 opacity-40" />


        {/* Star Watermark */}
        {/* <Image
          src="/assets/logos/favicon.png"
          alt="SSP Watermark"
          width={500}
          height={500}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 blur-sm z-[-1] pointer-events-none select-none"
        /> */}

        {/* Main Content */}
        <main className="relative z-10">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
