import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "恋爱日记 V1.1 · 高保真原型",
  description: "公开体验恋爱日记 V1.1：从灵感、共同安排到回忆沉淀。",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "恋爱日记 V1.1",
    description: "从灵感、共同安排到回忆沉淀，一条完整可点击体验。",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "恋爱日记高保真原型" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
