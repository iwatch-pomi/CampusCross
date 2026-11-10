import type { NextConfig } from "next";

/**
 * すべてのページに付けるセキュリティ用のヘッダー
 * - ほかのサイトに埋め込ませない（クリックジャッキング対策）
 * - ブラウザに中身の種類を推測させない
 * - 外部へのリンクでは、URL のパスを送らない
 * - カメラ・マイク・位置情報などは使わない
 * - 常に HTTPS で開かせる
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

// 全ページがログイン必須でリクエストごとに cookie を読むため、
// Cache Components は使わず従来の動的レンダリングにする。
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
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
