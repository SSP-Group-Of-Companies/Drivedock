// src/app/layout.tsx
/**
 * Root Layout — DriveDock (SSP Portal)
 * (trimmed header for brevity)
 */
import type { Metadata, Viewport } from "next";
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
  metadataBase: new URL('https://drivedock.ssp4you.com'),
  title: {
    default: "DriveDock – Digital Driver Onboarding Platform",
    template: "%s | DriveDock – SSP Truck Line"
  },
  description: "Streamlined digital onboarding platform for truck drivers at SSP Truck Line. Complete your application, documentation, and training requirements online with our secure, multilingual platform.",
  keywords: [
    "truck driver jobs",
    "CDL driver application", 
    "SSP Truck Line",
    "commercial driver registration",
    "trucking company careers",
    "driver onboarding platform",
    "truck driver hiring",
    "commercial driving jobs",
    "transport driver application",
    "freight driver careers",
    "digital driver application",
    "truck driver recruitment",
    "CDL jobs Canada",
    "CDL jobs USA",
    "long haul driver jobs",
    "local truck driver jobs"
  ],
  authors: [{ name: "SSP Truck Line" }],
  creator: "SSP Truck Line",
  publisher: "SSP Truck Line",
  
  // Robots and indexing
  robots: {
    index: true, // Allow indexing for discoverability
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  
  // Open Graph for social sharing
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://drivedock.ssp4you.com",
    siteName: "DriveDock",
    title: "DriveDock – Digital Driver Onboarding Platform",
    description: "Streamlined digital onboarding platform for truck drivers at SSP Truck Line. Complete your application, documentation, and training requirements online.",
    images: [
      {
        url: "/assets/logos/SSP-Truck-LineFullLogo.png",
        width: 1200,
        height: 630,
        alt: "SSP Truck Line - DriveDock Platform",
      }
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    site: "@SSPTruckLine", // Add your Twitter handle if you have one
    creator: "@SSPTruckLine",
    title: "DriveDock – Digital Driver Onboarding Platform",
    description: "Streamlined digital onboarding platform for truck drivers at SSP Truck Line.",
    images: ["/assets/logos/SSP-Truck-LineFullLogo.png"],
  },
  
  // App-specific metadata
  applicationName: "DriveDock",
  category: "Business",
  classification: "Transportation & Logistics",
  
  // Favicon and icons
  icons: {
    icon: [
      { url: "/assets/logos/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/logos/blackFavicon.png", sizes: "16x16", type: "image/png" }
    ],
    apple: [
      { url: "/assets/logos/drivedockIcon.png", sizes: "180x180", type: "image/png" }
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/assets/logos/blackFavicon.png",
        color: "#1e40af" // Blue color matching your brand
      }
    ]
  },
  
  
  // Security and verification
  verification: {
    // Add these if you have them:
    // google: "your-google-site-verification-code",
    // bing: "your-bing-verification-code",
  },
  
  // Additional metadata
  other: {
    "application-name": "DriveDock",
    "mobile-web-app-capable": "yes",
    "mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "DriveDock",
    "theme-color": "#1e40af",
    "msapplication-TileColor": "#1e40af",
    "msapplication-config": "none", // Since you don't have browserconfig.xml
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
