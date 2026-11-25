"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrandMarkInline } from "./BrandMark";
import { prefetchInsights } from "./insights/useInsights";

/**
 * 상단 메뉴 (두 단계)
 *   1단: MI 리포트(기본 화면) · 인사이트 대시보드   (오른쪽: 수집 채널 설정, 로그아웃)
 *   2단: MI 리포트 안에서 기사 선정·작성 · 발행 이력
 * 지금 화면은 빨간 책갈피 표시와 굵은 글씨로 보여 준다. 표시가 메뉴 사이를 미끄러져 움직인다.
 */
const PRIMARY = [
  { href: "/", label: "MI 리포트", short: "MI 리포트", match: (p: string) => p === "/" || p.startsWith("/issues") },
  { href: "/insights", label: "인사이트 대시보드", short: "인사이트", match: (p: string) => p.startsWith("/insights") },
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

  // MI 리포트 등 다른 화면에 있는 동안 인사이트 데이터를 미리 받아 둔다 (넘어갈 때 바로 보이도록)
  useEffect(() => {
    if (path === "/login" || path.startsWith("/insights")) return;
    const t = setTimeout(() => prefetchInsights(180), 3000); // 지금 화면이 다 뜬 뒤에
    return () => clearTimeout(t);
  }, [path]);

  if (path === "/login") return null;
  const inReport = PRIMARY[0].match(path);
  const settings = path.startsWith("/sources");

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  };

  return (
    <header ref={headerRef} className="site-header sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur">
      <div className="mx-auto flex h-[var(--header-h)] max-w-[1600px] items-stretch gap-2 px-3 sm:gap-6 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-3 text-[var(--ink)]" aria-label="TDL Trend 홈 (MI 리포트)">
          <BrandMarkInline className="h-[15px] w-auto sm:h-[22px]" />
          <span className="hidden border-l border-[var(--line)] pl-3 font-display text-[11px] leading-tight tracking-wide text-[var(--soft)] md:block">
            Market
            <br />
            Intelligence
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
                className={`nav-item relative flex items-center whitespace-nowrap px-2 text-sm sm:px-3 sm:text-[15px] ${on ? "font-bold text-[var(--ink)]" : "text-[var(--soft)] hover:text-[var(--ink)]"}`}
              >
                <span className="sm:hidden">{m.short}</span>
                <span className="hidden sm:inline">{m.label}</span>
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
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 ${settings ? "bg-[var(--brand-tint)] font-bold text-[var(--brand)]" : "text-[var(--soft)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"}`}
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
        <div className="border-t border-[var(--line)] bg-white shadow-[0_6px_14px_-12px_rgb(28_26_25/0.4)]">
          <div className="mx-auto flex max-w-[1600px] items-center gap-1 px-4 py-2 text-sm">
            <span className="mr-2 font-display text-[11px] font-bold tracking-[0.12em] text-[var(--brand)]">MI REPORT</span>
            {REPORT_TABS.map((t) => {
              const on = t.match(path);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 transition-colors ${on ? "bg-[var(--brand-tint)] font-bold text-[var(--brand)] shadow-[inset_0_-2px_0_var(--brand)]" : "text-[var(--soft)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"}`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
      {settings && (
        <div className="border-t border-[var(--line)] bg-white">
          <div className="mx-auto max-w-[1600px] px-4 py-1.5 text-[11px] font-bold text-[var(--mute)]">설정 · 수집 채널</div>
        </div>
      )}
    </header>
  );
}
