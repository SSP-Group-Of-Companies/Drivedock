import type { NextConfig } from "next";
import i18nConfig from "./next-i18next.config.js";

/**
 * Parse comma-separated hostnames from env (e.g. "cdn.example.com, imgix.net, mybucket.s3.us-east-1.amazonaws.com")
 */
function parseDomains(envVar?: string): string[] {
  if (!envVar) return [];
  return envVar
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

const imageDomains = parseDomains(process.env.NEXT_IMAGE_DOMAINS);

const nextConfig: NextConfig = {
  i18n: {
    ...i18nConfig.i18n,
    localeDetection: false,
  },
  reactStrictMode: true,
  images: {
    domains: imageDomains,
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      canvas: false,
    };

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

    if (isServer) {
      config.externals = [...(config.externals ?? []), { canvas: "commonjs canvas" }];
    }

    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: "asset/resource",
      generator: { filename: "static/worker/[hash][ext][query]" },
    });

    return config;
  },
};

export default nextConfig;
