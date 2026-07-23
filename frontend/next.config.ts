import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a fully static site (out/) — the dashboard is client-rendered,
  // so it deploys cleanly to Azure Static Web Apps.
  output: "export",
};

export default nextConfig;
