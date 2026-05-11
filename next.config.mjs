import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_PORT = (process.env.MC_PUBLIC_PORT || "4731").trim();
const PUBLIC_DIST_DIR = (process.env.MC_PUBLIC_DIST_DIR || ".next-public").trim();
const DEFAULT_DIST_DIR = ".next";
const distDir = process.env.NEXT_DIST_DIR?.trim() || DEFAULT_DIST_DIR;

function readCliPort(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--port" || arg === "-p") {
      return argv[index + 1];
    }
    if (arg.startsWith("--port=")) {
      return arg.slice("--port=".length);
    }
    if (arg.startsWith("-p=")) {
      return arg.slice("-p=".length);
    }
  }
  return process.env.PORT?.trim();
}

function assertPublicRuntimeGuard() {
  const [, , command, ...args] = process.argv;
  const port = readCliPort(args)?.trim();
  const isPublicStart = command === "start" && port === PUBLIC_PORT;
  if (!isPublicStart) {
    return;
  }

  const startedByWrapper = process.env.MC_RUNTIME_WRAPPER === "dev-server";
  const allowedPublicRuntime =
    process.env.MC_ALLOW_PUBLIC_RUNTIME === "1" &&
    process.env.NODE_ENV === "production" &&
    distDir === PUBLIC_DIST_DIR;

  if (startedByWrapper || allowedPublicRuntime) {
    return;
  }

  throw new Error(
    `[mission-control] Refusing to start public port ${PUBLIC_PORT} without an approved Mission Control runtime. Use "node scripts/dev-server.cjs --port ${PUBLIC_PORT}" for wrapper mode, or run the production public runtime with MC_ALLOW_PUBLIC_RUNTIME=1 and NEXT_DIST_DIR=${PUBLIC_DIST_DIR} (mission-control.service does this automatically).`
  );
}

assertPublicRuntimeGuard();

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir,
  outputFileTracingRoot: projectRoot,
  typescript: { ignoreBuildErrors: true },
  allowedDevOrigins: [
    "*.trycloudflare.com",
    ...(process.env.ALLOWED_DEV_ORIGINS
      ? process.env.ALLOWED_DEV_ORIGINS.split(",")
      : []),
  ],
  webpack(config) {
    config.cache = false;
    return config;
  },
  turbopack: {},
  async rewrites() {
    return [
      {
        source: '/login',
        destination: '/login',
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Pragma", value: "no-cache" },
          { key: "CDN-Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
