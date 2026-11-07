import path from "path";
import { fileURLToPath } from "url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dev and production builds must not overwrite each other's files.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  // A lockfile higher up the disk must not be mistaken for this project's root.
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  // The engine reads data/*.json at runtime, so ship those files with every server route.
  outputFileTracingIncludes: { "/**": ["./data/*.json"] },
  async redirects() {
    // Scores now live in Day's "Day energy" section.
    return [{ source: "/today", destination: "/calendar", permanent: false }];
  },
};

export default nextConfig;
