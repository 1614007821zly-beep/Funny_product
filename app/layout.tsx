import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://love-diary-v1-prototype.linyu518.chatgpt.site"),
  title: "恋爱日记 V58 · 会根据反馈变得更懂你",
  description: "恋爱日记 V58：用合适与不合适反馈持续优化灵感排序，并以不含隐私的运行监测守护服务稳定性。",
  themeColor: "#fbfaf8",
  icons: { icon: [{ url: "/favicon.ico", type: "image/x-icon" }, { url: "/favicon.png", type: "image/png" }], apple: "/favicon.png" },
  openGraph: {
    title: "恋爱日记 V58 · 会根据反馈变得更懂你",
    description: "关系、灵感、共同安排、回忆与数据安全，一条完整可点击体验。",
    siteName: "恋爱日记",
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "恋爱日记高保真原型" }],
  },
  twitter: { card: "summary_large_image", title: "恋爱日记 V58 · 会根据反馈变得更懂你", description: "用清晰反馈持续优化灵感排序，并以不含隐私的运行监测守护服务稳定性。", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><a className="skip-link" href="#main-content">跳到主要内容</a>{children}</body></html>;
}
