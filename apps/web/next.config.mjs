import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep file tracing inside this monorepo. Without an explicit root, a
  // user-level lockfile can make Next.js walk outside the project at build time.
  outputFileTracingRoot: path.resolve(webRoot, "../.."),
};

export default nextConfig;
