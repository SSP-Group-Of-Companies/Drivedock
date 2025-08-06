import type { NextConfig } from "next";
import i18nConfig from "./next-i18next.config.js";

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_REGION;

// Default S3 domain pattern
const s3Domain = bucketName && region
  ? `${bucketName}.s3.${region}.amazonaws.com`
  : undefined;

const nextConfig: NextConfig = {
  i18n: {
    ...i18nConfig.i18n,
    localeDetection: false,
  },
  reactStrictMode: true,
  images: {
    domains: s3Domain ? [s3Domain] : [],
  },
};

export default nextConfig;
