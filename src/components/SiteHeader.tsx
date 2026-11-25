"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { BrandMark } from "./BrandMark";

/**
 * 상단 메뉴 (두 단계)
 *   1단: 인사이트 대시보드 · MI 리포트   (오른쪽: 수집 채널 설정, 로그아웃)
 *   2단: MI 리포트 안에서 기사 선정·작성 · 발행 이력
 * 지금 화면은 빨간 책갈피 표시와 굵은 글씨로 보여 준다. 표시가 메뉴 사이를 미끄러져 움직인다.
 */
const PRIMARY = [
  { href: "/insights", label: "인사이트 대시보드", match: (p: string) => p.startsWith("/insights") },
  { href: "/", label: "MI 리포트", match: (p: string) => p === "/" || p.startsWith("/issues") },
] as const;
const REPORT_TABS = [
  { href: "/", label: "기사 선정 · 리포트 작성", match: (p: string) => p === "/" },
  { href: "/issues", label: "발행 이력", match: (p: string) => p.startsWith("/issues") },
] as const;

export function SiteHeader({ authEnabled }: { authEnabled: boolean }) {
  const path = usePathname() ?? "/";
  const navRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  const activeIdx = PRIMARY.findIndex((m) => m.match(path));

  // 책갈피 위치를 지금 메뉴에 맞춤 (창 크기가 바뀌어도)
  useLayoutEffect(() => {
    const place = () => {
      const el = navRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
      setBar(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    place();
    window.addEventListener("resize", place);
    document.fonts?.ready.then(place).catch(() => {});
    return () => window.removeEventListener("resize", place);
  }, [activeIdx]);

  // 헤더 전체 높이를 CSS 변수로 (붙박이 목차·사이드바가 헤더 바로 아래에 붙도록)
  const headerRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = headerRef.current;
    const set = () => document.documentElement.style.setProperty("--header-total", `${el ? el.offsetHeight : 0}px`);
    set();
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [path]);

  if (path === "/login") return null;
  const inReport = PRIMARY[1].match(path);
  const settings = path.startsWith("/sources");

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  };

  return (
    <header ref={headerRef} className="site-header sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur">
      <div className="mx-auto flex h-[var(--header-h)] max-w-[1600px] items-stretch gap-6 px-4">
        <Link href="/insights" className="flex shrink-0 items-center gap-3 text-[var(--ink)]" aria-label="TDL Trend 홈">
          <BrandMark className="h-[30px] w-auto" />
          <span className="hidden border-l border-[var(--line)] pl-3 text-[11px] leading-tight text-[var(--soft)] md:block">
            테크이노베이션팀
            <br />
            <span className="font-display tracking-wide">Market Intelligence</span>
          </span>
        </Link>

        <nav ref={navRef} aria-label="주 메뉴" className="relative flex items-stretch gap-1">
          {PRIMARY.map((m, i) => {
            const on = i === activeIdx;
            return (
              <Link
                key={m.href}
                href={m.href}
                data-idx={i}
                aria-current={on ? "page" : undefined}
                className={`nav-item relative flex items-center whitespace-nowrap px-3 text-[15px] ${on ? "font-bold text-[var(--ink)]" : "text-[var(--soft)] hover:text-[var(--ink)]"}`}
              >
                {m.label}
              </Link>
            );
          })}
          {/* 책갈피: 위쪽에 걸린 빨간 리본 + 아래 밑줄 */}
          {bar && (
            <>
              <span aria-hidden className="nav-bookmark" style={{ left: bar.left + bar.width / 2 - 7 }} />
              <span aria-hidden className="nav-underline" style={{ left: bar.left + 8, width: bar.width - 16 }} />
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1 text-sm">
          <Link
            href="/sources"
            aria-current={settings ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 ${settings ? "bg-[var(--ink)] font-bold text-white" : "text-[var(--soft)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"}`}
            title="수집 채널 설정"
          >
            <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="10" cy="10" r="2.6" />
              <path d="M10 2.5v2.2M10 15.3v2.2M2.5 10h2.2M15.3 10h2.2M4.7 4.7l1.6 1.6M13.7 13.7l1.6 1.6M4.7 15.3l1.6-1.6M13.7 6.3l1.6-1.6" />
            </svg>
            <span className="hidden sm:inline">수집 채널</span>
          </Link>
          {authEnabled && (
            <button type="button" onClick={logout} className="rounded-md px-2.5 py-1.5 text-[var(--mute)] hover:bg-[var(--wash)] hover:text-[var(--ink)]">
              로그아웃
            </button>
          )}
        </div>
      </div>

      {/* 2단: MI 리포트 안의 화면 */}
      {inReport && (
        <div className="border-t border-[var(--line)] bg-[var(--wash)]">
          <div className="mx-auto flex max-w-[1600px] items-center gap-1 px-4 py-1.5 text-sm">
            <span className="mr-2 text-[11px] font-bold text-[var(--mute)]">MI 리포트</span>
            {REPORT_TABS.map((t) => {
              const on = t.match(path);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={`rounded-full px-3 py-1 transition-colors ${on ? "bg-[var(--ink)] font-bold text-white" : "text-[var(--soft)] hover:bg-white hover:text-[var(--ink)]"}`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
      {settings && (
        <div className="border-t border-[var(--line)] bg-[var(--wash)]">
          <div className="mx-auto max-w-[1600px] px-4 py-1.5 text-[11px] font-bold text-[var(--mute)]">설정 · 수집 채널</div>
        </div>
      )}
    </header>
  );
}
