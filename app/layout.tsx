import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { SITE } from "@/lib/content";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: SITE.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: SITE.themeColor,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
