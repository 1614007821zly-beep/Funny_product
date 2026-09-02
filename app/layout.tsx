import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://love-diary-v1-prototype.linyu518.chatgpt.site"),
  title: "恋爱日记 V56 · 外部服务故障仍可继续",
  description: "恋爱日记 V56：高德或 AI 暂时不可用时保留用户条件，天气切换备用来源，灵感不虚构具体地点。",
  themeColor: "#fbfaf8",
  icons: { icon: [{ url: "/favicon.ico", type: "image/x-icon" }, { url: "/favicon.png", type: "image/png" }], apple: "/favicon.png" },
  openGraph: {
    title: "恋爱日记 V56 · 外部服务故障仍可继续",
    description: "关系、灵感、共同安排、回忆与数据安全，一条完整可点击体验。",
    siteName: "恋爱日记",
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "恋爱日记高保真原型" }],
  },
  twitter: { card: "summary_large_image", title: "恋爱日记 V56 · 外部服务故障仍可继续", description: "高德或 AI 暂时不可用时仍可继续规划，并明确标注数据来源和待核验内容。", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><a className="skip-link" href="#main-content">跳到主要内容</a>{children}</body></html>;
}
