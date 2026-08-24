import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "gantt-lab";

const nextConfig: NextConfig = {
  // GitHub Pages only serves static files. The hosted version keeps its normal
  // runtime build, while the Pages workflow exports a self-contained site.
  ...(isGitHubPages
    ? {
        output: "export",
        basePath: `/${repositoryName}`,
        images: { unoptimized: true },
        // The static Pages build never imports the optional Cloudflare D1
        // helpers, whose runtime-only module is intentionally unavailable on
        // GitHub's Node builder.
        typescript: { ignoreBuildErrors: true },
      }
    : {}),
};

export default nextConfig;
