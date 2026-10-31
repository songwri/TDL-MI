import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "TDL Trend 리포트 작성",
  description: "물류·로봇 자동화 바이위클리 Market Intelligence 뉴스레터 생성기",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;700&display=swap" />
      </head>
      <body className="font-sans antialiased">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-brand">
              <span className="text-lg font-bold tracking-tight">TDL Trend</span>
              <span className="rounded bg-brand/10 px-1.5 py-0.5 text-xs font-medium">테크이노베이션 · Market Intelligence Report</span>
            </Link>
            <nav className="flex gap-4 text-sm text-slate-600">
              <Link href="/" className="hover:text-brand">대시보드</Link>
              <Link href="/issues" className="hover:text-brand">발행 이력 (MI 아카이브)</Link>
              <Link href="/sources" className="hover:text-brand">수집 채널</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-5">{children}</main>
      </body>
    </html>
  );
}
