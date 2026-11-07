import type { NextConfig } from "next";

// 全ページがログイン必須でリクエストごとに cookie を読むため、
// Cache Components は使わず従来の動的レンダリングにする。
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
