import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://love-diary-v1-prototype.linyu518.chatgpt.site"),
  title: "恋爱日记 V1.17 · 真实服务完善",
  description: "恋爱日记 V1.17：通知偏好、照片、分享、反馈、数据导出与节假日信息均接入真实服务。",
  themeColor: "#fbfaf8",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "恋爱日记 V1.17 · 真实服务完善",
    description: "关系、灵感、共同安排、回忆与数据安全，一条完整可点击体验。",
    siteName: "恋爱日记",
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "恋爱日记高保真原型" }],
  },
  twitter: { card: "summary_large_image", title: "恋爱日记 V1.17 · 真实服务完善", description: "通知、照片、分享与数据导出均由真实服务支持。", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><a className="skip-link" href="#main-content">跳到主要内容</a>{children}</body></html>;
}
