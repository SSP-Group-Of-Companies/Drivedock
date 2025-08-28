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

// NEW: read user once and provide globally
import { currentUser } from "@/lib/auth/authUtils";
import { AuthProvider } from "./providers/authProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DriveDock – Driver Onboarding",
  description: "Digital onboarding for truck drivers at SSP Truck Line",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Decode JWT once per request
  const user = await currentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/logos/blackFavicon.png" type="image/png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Only apply theme if no theme class is already present
                  var root = document.documentElement;
                  if (!root.classList.contains('light') && !root.classList.contains('dark')) {
                    var theme = localStorage.getItem('drivedock_theme');
                    if (theme) {
                      var parsed = JSON.parse(theme);
                      var resolvedTheme = parsed.state?.resolvedTheme || 'light';
                      root.classList.add(resolvedTheme);
                    } else {
                      root.classList.add('light');
                    }
                  }
                } catch (e) {
                  // Fallback to light theme if anything goes wrong
                  if (!document.documentElement.classList.contains('light') && !document.documentElement.classList.contains('dark')) {
                    document.documentElement.classList.add('light');
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased relative min-h-screen overflow-x-hidden bg-white text-gray-900`} suppressHydrationWarning>
        {/* Make user available to the entire app */}
        <AuthProvider user={user}>
          <I18nProvider>
            {/* Background Gradient Layer */}
            <div className="absolute inset-0 z-[-2] bg-gradient-to-br from-white via-blue-100 to-blue-600 opacity-40" />

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
