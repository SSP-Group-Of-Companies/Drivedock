// src/app/layout.tsx
/**
 * Root Layout — DriveDock (SSP Portal)
 * (trimmed header for brevity)
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import I18nProvider from "./providers/i18n-provider";
import PageTransitionWrapper from "@/components/shared/PageTransitionWrapper";
import GlobalLayoutWrapper from "@/components/shared/GlobalLayoutWrapper";
import ConditionalBackground from "@/components/shared/ConditionalBackground";

// NEW: read user once and provide globally
import { currentUser } from "@/lib/utils/auth/authUtils";
import { AuthProvider } from "./providers/authProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DriveDock – Driver Onboarding",
  description: "Digital onboarding for truck drivers at SSP Truck Line",
};

export default async function RootLayout({ children }: { children: React.ReactNode; headers: () => Promise<Headers> }) {
  // Decode JWT once per request
  const user = await currentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/logos/blackFavicon.png" type="image/png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased relative min-h-screen overflow-x-hidden`} suppressHydrationWarning>
        {/* Make user available to the entire app */}
        <AuthProvider user={user}>
          <I18nProvider>
            {/* Conditional Background Gradient Layer - Only for non-dashboard routes */}
            <ConditionalBackground />

            {/* Main Content Area with Smooth Transitions and Global Loading */}
            <GlobalLayoutWrapper>
              <PageTransitionWrapper>
                <main className="relative z-10">{children}</main>
              </PageTransitionWrapper>
            </GlobalLayoutWrapper>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
