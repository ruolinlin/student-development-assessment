import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/student-development-assessment',
  assetPrefix: '/student-development-assessment/',
  trailingSlash: true,
};

export default nextConfig;
