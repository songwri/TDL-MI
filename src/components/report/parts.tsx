"use client";

import { useCallback, useState, type ReactNode } from "react";
import { CATEGORY_COLORS, RAMP } from "@/config/brand";
import { parseRich } from "@/lib/report/rich";
import type { ReportContent, ViewerData } from "@/lib/types";

/** 모든 차트가 함께 쓰는 툴팁: 값이 먼저, 이름은 보조. 마우스와 키보드 포커스 모두 같은 내용을 보여 준다 */
export interface Tip {
  x: number;
  y: number;
  node: ReactNode;
}

export function useTip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const show = useCallback((e: React.PointerEvent | React.FocusEvent, node: ReactNode) => {
    if ("clientX" in e && (e.clientX || e.clientY)) setTip({ x: e.clientX, y: e.clientY, node });
    else {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setTip({ x: r.left + r.width / 2, y: r.top, node });
    }
  }, []);
  const hide = useCallback(() => setTip(null), []);
  const view = tip && (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 max-w-[280px] rounded-md border border-[var(--rv-line)] bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left: Math.min(tip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 296), top: tip.y + 14 }}
    >
      {tip.node}
    </div>
  );
  return { show, hide, view };
}

export const TipRow = ({ value, label, color }: { value: ReactNode; label: ReactNode; color?: string }) => (
  <div className="flex items-baseline gap-2">
    {color && <span aria-hidden className="inline-block h-[3px] w-3 shrink-0 translate-y-[-3px]" style={{ background: color }} />}
    <b className="text-sm tabular-nums text-[var(--rv-ink)]">{value}</b>
    <span className="text-[var(--rv-soft)]">{label}</span>
  </div>
);

export const catColor = (c: string) => CATEGORY_COLORS[c] ?? CATEGORY_COLORS["기타"];
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** 채운 색 위 글자: 흰색, 단 노랑처럼 밝은 색에서는 검정 */
export const inkOn = (bg: string) => (1.05 / (lum(bg) + 0.05) >= 2.3 ? "#fff" : "#0b0b0b");

export interface SegItem {
  key: string;
  label: string;
  value: number;
  color: string;
  detail?: ReactNode;
  active?: boolean;
}

/** 누적(분할) 막대: 조각 사이 2px 간격, 양 끝만 둥글게, 조각이 충분히 클 때만 숫자를 안에 표시. 클릭하면 필터 */
export function SegBar({
  items,
  height = 28,
  onPick,
  tip,
  dimInactive = false,
}: {
  items: SegItem[];
  height?: number;
  onPick?: (key: string) => void;
  tip: ReturnType<typeof useTip>;
  dimInactive?: boolean;
}) {
  const total = items.reduce((n, i) => n + i.value, 0);
  if (!total) return null;
  return (
    <div className="flex gap-[2px] overflow-hidden rounded-[4px]" style={{ height }}>
      {items
        .filter((i) => i.value > 0)
        .map((i) => {
          const share = i.value / total;
          const dim = dimInactive && i.active === false;
          return (
            <button
              key={i.key}
              type="button"
              className="rv-seg flex items-center justify-center text-[11px] font-bold"
              style={{ flexGrow: i.value, flexBasis: 0, background: i.color, color: inkOn(i.color), opacity: dim ? 0.28 : 1, cursor: onPick ? "pointer" : "default", minWidth: 4 }}
              aria-label={`${i.label} ${i.value}건 (${Math.round(share * 100)}%)`}
              aria-pressed={onPick ? i.active !== false : undefined}
              onClick={() => onPick?.(i.key)}
              onPointerMove={(e) => tip.show(e, <><TipRow value={`${i.value}건`} label={`${i.label} · ${Math.round(share * 100)}%`} color={i.color} />{i.detail}</>)}
              onFocus={(e) => tip.show(e, <TipRow value={`${i.value}건`} label={i.label} color={i.color} />)}
              onPointerLeave={tip.hide}
              onBlur={tip.hide}
            >
              {share >= 0.09 ? i.value : ""}
            </button>
          );
        })}
    </div>
  );
}

export function Legend({ items, onPick }: { items: SegItem[]; onPick?: (key: string) => void }) {
  const total = items.reduce((n, i) => n + i.value, 0);
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--rv-soft)]">
      {items
        .filter((i) => i.value > 0)
        .map((i) => (
          <button
            key={i.key}
            type="button"
            onClick={() => onPick?.(i.key)}
            className="inline-flex items-center gap-1.5 hover:text-[var(--rv-ink)]"
            style={{ opacity: i.active === false ? 0.45 : 1, cursor: onPick ? "pointer" : "default" }}
          >
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: i.color }} />
            {i.label} <span className="tabular-nums">{i.value}건 ({Math.round((i.value / total) * 100)}%)</span>
          </button>
        ))}
    </div>
  );
}

/** 순위 막대 (강조형): 이어지는 주제는 강조색, 나머지는 회색 */
export function RankBars({
  rows,
  tip,
  unit = "건",
}: {
  rows: { label: string; value: number; color: string; hint: string }[];
  tip: ReturnType<typeof useTip>;
  unit?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li
          key={r.label}
          tabIndex={0}
          className="group grid grid-cols-[minmax(90px,150px)_1fr_36px] items-center gap-3 rounded px-1 py-0.5 text-sm hover:bg-[var(--rv-tint)]"
          onPointerMove={(e) => tip.show(e, <TipRow value={`${r.value}${unit}`} label={`${r.label} · ${r.hint}`} color={r.color} />)}
          onFocus={(e) => tip.show(e, <TipRow value={`${r.value}${unit}`} label={`${r.label} · ${r.hint}`} color={r.color} />)}
          onPointerLeave={tip.hide}
          onBlur={tip.hide}
        >
          <span className="truncate">{r.label}</span>
          <span className="h-3 rounded-r-[4px]" style={{ width: `${(r.value / max) * 100}%`, background: r.color, minWidth: 4 }} />
          <span className="text-right text-xs font-bold tabular-nums text-[var(--rv-soft)]">{r.value}{unit}</span>
        </li>
      ))}
    </ul>
  );
}

/** 크기 → 파랑 한 가지 색 단계 */
export function rampColor(n: number, max: number) {
  if (n <= 0) return "#f1f0ec";
  return RAMP[Math.min(RAMP.length - 1, Math.round(((n - 1) / Math.max(max - 1, 1)) * (RAMP.length - 1)))];
}

/** 호별 카테고리 추이: 행 = 호, 구간 = 카테고리. 카테고리 필터를 따른다 */
export function TrendBars({ stats, active, tip }: { stats: NonNullable<ReportContent["stats"]>; active: Set<string>; tip: ReturnType<typeof useTip> }) {
  const { issues, category } = stats.trend;
  const rows = issues.map((iss, idx) => ({
    iss,
    segs: category.filter((c) => active.has(c.label)).map((c) => ({ label: c.label, value: c.counts[idx] ?? 0 })),
  }));
  const max = Math.max(...rows.map((r) => r.segs.reduce((n, s) => n + s.value, 0)), 1);
  return (
    <div className="space-y-1.5">
      {rows.map(({ iss, segs }) => {
        const total = segs.reduce((n, s) => n + s.value, 0);
        return (
          <div key={iss.no} className="grid grid-cols-[56px_1fr_44px] items-center gap-3 text-sm">
            <span className={iss.current ? "font-bold text-[var(--rv-accent)]" : ""}>제{iss.no}호</span>
            <div className="flex h-5 gap-[2px] overflow-hidden rounded-r-[4px]" style={{ width: `${(total / max) * 100}%`, minWidth: total ? 8 : 0 }}>
              {segs
                .filter((s) => s.value > 0)
                .map((s) => (
                  <span
                    key={s.label}
                    tabIndex={0}
                    className="rv-seg flex items-center justify-center text-[10px] font-bold"
                    style={{ flexGrow: s.value, flexBasis: 0, background: catColor(s.label), color: inkOn(catColor(s.label)) }}
                    onPointerMove={(e) => tip.show(e, <TipRow value={`${s.value}건`} label={`제${iss.no}호 · ${s.label}`} color={catColor(s.label)} />)}
                    onFocus={(e) => tip.show(e, <TipRow value={`${s.value}건`} label={`제${iss.no}호 · ${s.label}`} color={catColor(s.label)} />)}
                    onPointerLeave={tip.hide}
                    onBlur={tip.hide}
                  >
                    {s.value}
                  </span>
                ))}
            </div>
            <span className="text-xs tabular-nums text-[var(--rv-soft)]">{total}건</span>
          </div>
        );
      })}
    </div>
  );
}

/** 키워드 × 호 히트맵 */
export function Heat({ stats, tip }: { stats: NonNullable<ReportContent["stats"]>; tip: ReturnType<typeof useTip> }) {
  const { issues, keywords } = stats.trend;
  const max = Math.max(...keywords.flatMap((k) => k.counts), 1);
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-[2px] text-xs">
        <thead>
          <tr>
            <th />
            {issues.map((i) => (
              <th key={i.no} className={`px-2 pb-1 font-medium ${i.current ? "text-[var(--rv-accent)]" : "text-[var(--rv-soft)]"}`}>제{i.no}호</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keywords.map((k) => (
            <tr key={k.label}>
              <th className="whitespace-nowrap pr-3 text-left font-normal">{k.label}</th>
              {k.counts.map((n, i) => {
                const bg = rampColor(n, max);
                return (
                  <td
                    key={i}
                    tabIndex={0}
                    className="rv-seg h-7 w-14 rounded-[3px] text-center font-bold"
                    style={{ background: bg, color: RAMP.indexOf(bg as (typeof RAMP)[number]) >= 3 ? "#fff" : "#0b0b0b" }}
                    onPointerMove={(e) => tip.show(e, <TipRow value={`${n}건`} label={`${k.label} · 제${issues[i].no}호`} color={n ? bg : undefined} />)}
                    onFocus={(e) => tip.show(e, <TipRow value={`${n}건`} label={`${k.label} · 제${issues[i].no}호`} />)}
                    onPointerLeave={tip.hide}
                    onBlur={tip.hide}
                  >
                    {n || ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 flex items-center gap-1 text-[11px] text-[var(--rv-mute)]">
        적음 {RAMP.map((c) => <span key={c} aria-hidden className="inline-block h-2.5 w-4 rounded-[2px]" style={{ background: c }} />)} 많음
      </p>
    </div>
  );
}

const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/**
 * 인사이트 맵: 어떤 기사가 어떤 주제의 근거인지 선으로 보여 준다.
 * 왼쪽 = 주제, 오른쪽 = 근거 기사(카테고리 색). 마우스를 올리면 연결된 것만 남고, 주제를 누르면 해당 본문으로 이동한다.
 */
export function InsightMap({
  themes,
  articles,
  active,
  onTheme,
}: {
  themes: ReportContent["themes"];
  articles: ViewerData["articles"];
  active: Set<string>;
  onTheme: (i: number) => void;
}) {
  const [hover, setHover] = useState<{ kind: "t" | "a"; id: string } | null>(null);
  const W = 820;
  const rowH = 38;
  const nodeW = 330;
  // 기사는 첫 번째로 연결된 주제 순서로 정렬
  const firstTheme = (id: string) => {
    const i = themes.findIndex((t) => t.sourceArticleIds.includes(id));
    return i < 0 ? 99 : i;
  };
  const arts = articles
    .map((a, idx) => ({ a, no: idx + 1 }))
    .sort((x, y) => firstTheme(x.a.id) - firstTheme(y.a.id) || x.no - y.no);
  const H = Math.max(arts.length * rowH, themes.length * 64) + 8;
  const ay = (i: number) => 4 + (i + 0.5) * ((H - 8) / arts.length);
  const ty = (i: number) => 4 + (i + 0.5) * ((H - 8) / themes.length);
  const edges = themes.flatMap((t, ti) =>
    t.sourceArticleIds.flatMap((id) => {
      const ai = arts.findIndex((x) => x.a.id === id);
      return ai < 0 ? [] : [{ ti, ai, id, cat: arts[ai].a.category }];
    }),
  );
  const lit = (e: (typeof edges)[number]) => !hover || (hover.kind === "t" ? hover.id === String(e.ti) : hover.id === e.id);
  const litTheme = (i: number) => !hover || (hover.kind === "t" ? hover.id === String(i) : themes[i].sourceArticleIds.includes(hover.id));
  const litArt = (id: string) => !hover || (hover.kind === "a" ? hover.id === id : themes[Number(hover.id)].sourceArticleIds.includes(id));

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`인사이트 맵: 주제 ${themes.length}개와 근거 기사 ${articles.length}건의 연결`}>
        {edges.map((e, i) => {
          const x1 = nodeW, x2 = W - nodeW;
          const y1 = ty(e.ti), y2 = ay(e.ai);
          return (
            <path
              key={i}
              d={`M${x1} ${y1} C ${x1 + 60} ${y1}, ${x2 - 60} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={catColor(e.cat)}
              strokeWidth={lit(e) ? 2.5 : 1.5}
              opacity={lit(e) ? (active.has(e.cat) ? 0.95 : 0.25) : 0.12}
            />
          );
        })}
        {themes.map((t, i) => (
          <g
            key={i}
            tabIndex={0}
            role="button"
            aria-label={`주제 ${i + 1} ${t.title}: 본문으로 이동`}
            className="cursor-pointer"
            opacity={litTheme(i) ? 1 : 0.35}
            onPointerEnter={() => setHover({ kind: "t", id: String(i) })}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover({ kind: "t", id: String(i) })}
            onBlur={() => setHover(null)}
            onClick={() => onTheme(i)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onTheme(i)}
          >
            <rect x={0} y={ty(i) - 26} width={nodeW} height={52} rx={4} fill="#fbf1ef" stroke="#a72b2b" strokeWidth={hover?.kind === "t" && hover.id === String(i) ? 2 : 1} />
            <text x={14} y={ty(i) - 5} fontSize={11} fontWeight={700} fill="#a72b2b">주제 {i + 1}</text>
            <text x={14} y={ty(i) + 14} fontSize={12.5} fill="currentColor">{short(t.title, 26)}</text>
          </g>
        ))}
        {arts.map(({ a, no }, i) => (
          <a key={a.id} href={a.link} target="_blank" rel="noreferrer">
            <g
              opacity={litArt(a.id) ? (active.has(a.category) ? 1 : 0.4) : 0.3}
              onPointerEnter={() => setHover({ kind: "a", id: a.id })}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover({ kind: "a", id: a.id })}
              onBlur={() => setHover(null)}
            >
              <rect x={W - nodeW} y={ay(i) - 15} width={nodeW} height={30} rx={4} fill="#fff" stroke="#e1e0d9" />
              <rect x={W - nodeW} y={ay(i) - 15} width={5} height={30} rx={2} fill={catColor(a.category)} />
              <text x={W - nodeW + 16} y={ay(i) + 4.5} fontSize={12} fill="currentColor">
                <tspan fontWeight={700}>[{no}] </tspan>
                {short(a.title, 30)}
              </text>
              <title>{a.title}</title>
            </g>
          </a>
        ))}
      </svg>
      <figcaption className="mt-1 text-xs text-[var(--rv-mute)]">선 색은 기사의 카테고리입니다. 주제를 누르면 본문으로, 기사를 누르면 원문으로 이동합니다.</figcaption>
    </figure>
  );
}

/** 문장 속 **핵심 구절**을 형광펜으로 표시 */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((p, i) =>
        p.hl ? (
          <mark key={i} className="rounded-[2px] bg-[#ffeda8] px-0.5 font-bold text-[var(--rv-ink)]">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}
