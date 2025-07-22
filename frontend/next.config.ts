import type { NextConfig } from "next";
import i18nConfig from "./next-i18next.config.js"; 

const nextConfig: NextConfig = {
  i18n: {
    ...i18nConfig.i18n,
    localeDetection: false as false // Typescript
  },
  reactStrictMode: true,
};

export default nextConfig;
