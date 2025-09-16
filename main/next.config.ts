import type { NextConfig } from "next";
import i18nConfig from "./next-i18next.config.js";

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_REGION;
const s3Domain = bucketName && region ? `${bucketName}.s3.${region}.amazonaws.com` : undefined;

function parseExtraDomains(envVar?: string): string[] {
  if (!envVar) return [];
  return envVar
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseRemotePatterns(envVar?: string) {
  if (!envVar) return [];
  return envVar
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((pattern) => {
      try {
        const hasProto = /^[a-zA-Z]+:\/\//.test(pattern);
        const url = new URL(hasProto ? pattern : `https://${pattern}`);
        return {
          protocol: (url.protocol.replace(":", "") as "http" | "https") ?? "https",
          hostname: url.hostname,
          pathname: url.pathname || "/**",
        };
      } catch {
        return null;
      }
    })
    .filter((v): v is { protocol: "http" | "https"; hostname: string; pathname: string } => !!v);
}

const extraDomains = parseExtraDomains(process.env.NEXT_IMAGE_EXTRA_DOMAINS);
const remotePatterns = parseRemotePatterns(process.env.NEXT_IMAGE_REMOTE_PATTERNS);

const domains = Array.from(new Set([...(s3Domain ? [s3Domain] : []), ...extraDomains]));

const nextConfig: NextConfig = {
  i18n: {
    ...i18nConfig.i18n,
    localeDetection: false,
  },
  reactStrictMode: true,
  images: {
    domains,
    remotePatterns, // <-- always an array now ([], not undefined)
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
