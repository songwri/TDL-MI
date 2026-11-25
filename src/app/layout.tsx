import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "TDL Trend",
  description: "물류·로봇 Market Intelligence: 격주 MI 리포트와 인사이트 대시보드",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased">
        <SiteHeader authEnabled={!!process.env.APP_PASSWORD} />
        <main className="mx-auto max-w-[1600px] px-4 py-5">{children}</main>
      </body>
    </html>
  );
}
