import type { NextConfig } from "next";
import i18nConfig from "./next-i18next.config.js";

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_REGION;

// Default S3 domain pattern
const s3Domain = bucketName && region ? `${bucketName}.s3.${region}.amazonaws.com` : undefined;

const nextConfig: NextConfig = {
  i18n: {
    ...i18nConfig.i18n,
    localeDetection: false,
  },
  reactStrictMode: true,
  images: {
    domains: s3Domain ? [s3Domain] : [],
  },
  webpack: (config, { isServer }) => {
    // Handle canvas module and other Node.js modules for PDF viewer
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      };
    }

    // Handle PDF.js worker
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: "asset/resource",
      generator: {
        filename: "static/worker/[hash][ext][query]",
      },
    });

    return config;
  },
};

export default nextConfig;
