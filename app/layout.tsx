import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "恋爱日记 V1.7 · 无障碍高保真原型",
  description: "恋爱日记 V1.7：双方资料、开放状态、共同日历、协作安排与回忆管理完整体验。",
  themeColor: "#fbfaf8",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "恋爱日记 V1.7 · 正式体验版",
    description: "关系、灵感、共同安排与回忆，一条完整可点击体验。",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "恋爱日记高保真原型" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><a className="skip-link" href="#main-content">跳到主要内容</a>{children}</body></html>;
}
