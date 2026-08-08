import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "恋爱日记 · 高保真原型",
  description: "把两个人一起生活的小事，好好留下。",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "恋爱日记",
    description: "把一起生活的小事，好好留下。",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "恋爱日记高保真原型" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
