import type { NextConfig } from "next";
import i18nConfig from "./next-i18next.config.js";

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_REGION;
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
    // Hard-alias `canvas` to false in BOTH client & server bundles
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      canvas: false,
    };

    // Also set fallbacks for modules some pdfjs/react-pdf-viewer paths poke at
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      canvas: false,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
      process: false,
    };

    // Keep `canvas` out of the Node/SSR bundle entirely
    if (isServer) {
      config.externals = [...(config.externals ?? []), { canvas: "commonjs canvas" }];
    }

    // You don't actually need a worker file rule because you’re using <Worker> with a CDN URL.
    // If you want to keep it, it’s harmless; otherwise you can remove the block below.
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: "asset/resource",
      generator: { filename: "static/worker/[hash][ext][query]" },
    });

    return config;
  },
};

export default nextConfig;
