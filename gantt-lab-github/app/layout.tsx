import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "gantt!lab｜可編輯的甘特圖工作台",
  description: "拖曳任務、客製 Bar 樣式，並匯出可繼續修改的 Excel 甘特圖。",
  openGraph: {
    title: "gantt!lab",
    description: "可編輯的甘特圖工作台",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "gantt!lab 品牌預覽" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "gantt!lab",
    description: "可編輯的甘特圖工作台",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
