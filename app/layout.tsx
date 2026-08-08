import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "恋爱日记 V1.2 · 正式高保真原型",
  description: "恋爱日记正式体验版：从关系状态、灵感与共同安排，到真实经历自然沉淀为回忆。",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "恋爱日记 V1.2 · 正式体验版",
    description: "关系、灵感、共同安排与回忆，一条完整可点击体验。",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "恋爱日记高保真原型" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
