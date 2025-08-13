// next.config.ts
import type { NextConfig } from "next";
import i18nConfig from "./next-i18next.config.js";

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_REGION;

// Build-time S3 host (handles both regional and legacy endpoints)
const s3Host = bucketName && region ? `${bucketName}.s3.${region}.amazonaws.com` : bucketName ? `${bucketName}.s3.amazonaws.com` : undefined;

const nextConfig: NextConfig = {
  i18n: {
    ...i18nConfig.i18n,
    localeDetection: false,
  },
  reactStrictMode: true,
  images: {
    // `domains` is deprecated; use `remotePatterns`
    remotePatterns: s3Host
      ? [
          {
            protocol: "https",
            hostname: s3Host,
            pathname: "**", // or narrow this if you want (e.g., `${yourPrefix}/**`)
          },
        ]
      : [],
  },
};

export default nextConfig;
