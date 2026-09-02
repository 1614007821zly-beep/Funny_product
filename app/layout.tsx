import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://love-diary-v1-prototype.linyu518.chatgpt.site"),
  title: "恋爱日记 V55 · 可恢复的真实体验",
  description: "恋爱日记 V55：AI、地点、天气与双人同步异常均可明确恢复，用户条件和已有内容不会因失败丢失。",
  themeColor: "#fbfaf8",
  icons: { icon: [{ url: "/favicon.ico", type: "image/x-icon" }, { url: "/favicon.png", type: "image/png" }], apple: "/favicon.png" },
  openGraph: {
    title: "恋爱日记 V55 · 可恢复的真实体验",
    description: "关系、灵感、共同安排、回忆与数据安全，一条完整可点击体验。",
    siteName: "恋爱日记",
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "恋爱日记高保真原型" }],
  },
  twitter: { card: "summary_large_image", title: "恋爱日记 V55 · 可恢复的真实体验", description: "关键服务失败时保留条件与内容，并提供清晰的恢复入口。", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><a className="skip-link" href="#main-content">跳到主要内容</a>{children}</body></html>;
}
