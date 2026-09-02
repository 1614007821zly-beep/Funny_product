import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://love-diary-v1-prototype.linyu518.chatgpt.site"),
  title: "恋爱日记 V59 · 账号与隐私控制更完整",
  description: "恋爱日记 V59：补齐用户协议、隐私政策与安全的账号注销，让每个人都能清楚管理自己的数据。",
  themeColor: "#fbfaf8",
  icons: { icon: [{ url: "/favicon.ico", type: "image/x-icon" }, { url: "/favicon.png", type: "image/png" }], apple: "/favicon.png" },
  openGraph: {
    title: "恋爱日记 V59 · 账号与隐私控制更完整",
    description: "关系、灵感、共同安排、回忆与数据安全，一条完整可点击体验。",
    siteName: "恋爱日记",
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "恋爱日记高保真原型" }],
  },
  twitter: { card: "summary_large_image", title: "恋爱日记 V59 · 账号与隐私控制更完整", description: "补齐用户协议、隐私政策与安全的账号注销，让每个人都能清楚管理自己的数据。", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><a className="skip-link" href="#main-content">跳到主要内容</a>{children}</body></html>;
}
