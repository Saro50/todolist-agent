import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack 配置
  turbopack: {
    // 原生模块配置
    resolveAlias: {
      "better-sqlite3": "better-sqlite3",
    },
  },
  
  // Webpack 配置（备用）
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("better-sqlite3");
    }
    return config;
  },
};

export default nextConfig;
