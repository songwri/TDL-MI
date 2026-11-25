"use client";

import { useMemo } from "react";
import type { PortfolioData } from "@/lib/insights/compute";
import { type useTip } from "@/components/report/parts";
import { TipCard, deltaOf } from "./charts";

type TipApi = ReturnType<typeof useTip>;

/** 강조 한 가지: CL사업 연관 높음 = 브랜드 레드, 나머지 = 회색 (색은 연관도에 붙고 순위에 따라 바뀌지 않음) */
export const FOCUS = "#A72B2B";
export const pp = (x: number) => `${Math.round(x * 100)}%`;

const W = 960, H = 520, L = 64, R = 28, T = 28, B = 56;
const PW = W - L - R, PH = H - T - B;

const textW = (t: string) => [...t].reduce((n, ch) => n + (/[ㄱ-힝]/.test(ch) ? 13.2 : 8), 0);
type Box = { x0: number; y0: number; x1: number; y1: number };
const hit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/**
 * LX판토스 기술 포트폴리오 매트릭스.
 * 가로 = 성숙도(기사 속 도입·실증 신호 비중), 세로 = 관심도(추적 기술 언급 점유율), 크기 = 최근 기사 수.
 * 회색 작은 원 → 큰 원: 지난 기간 → 최근 기간 이동. 사분면 기준선 = 최근 기간 중앙값.
 */
/**
 * 겹침 풀기: 원끼리 겹치면 서로 밀어내고, 실제 위치로 약하게 당긴다 (최대 몇십 px 이동).
 * 옮겨진 원은 실제 위치에 작은 점 + 가는 선을 남겨, 값은 그대로 읽히게 한다.
 */
function relax<T extends { tx: number; ty: number; r: number }>(nodes: T[]): (T & { cx: number; cy: number })[] {
  const n = nodes.map((d, i) => ({ ...d, cx: d.tx + (i % 3) * 0.01, cy: d.ty + (i % 2) * 0.01 }));
  for (let it = 0; it < 160; it++) {
    for (let i = 0; i < n.length; i++)
      for (let j = i + 1; j < n.length; j++) {
        const a = n[i], b = n[j];
        let dx = b.cx - a.cx, dy = b.cy - a.cy;
        let d = Math.hypot(dx, dy);
        const min = a.r + b.r + 3;
        if (d >= min) continue;
        if (d < 1e-6) {
          const ang = (j * 2.4) % (Math.PI * 2);
          dx = Math.cos(ang);
          dy = Math.sin(ang);
          d = 1;
        }
        const push = (min - d) / 2;
        a.cx -= (dx / d) * push;
        a.cy -= (dy / d) * push;
        b.cx += (dx / d) * push;
        b.cy += (dy / d) * push;
      }
    for (const d of n) {
      d.cx += (d.tx - d.cx) * 0.04;
      d.cy += (d.ty - d.cy) * 0.04;
      d.cx = Math.min(Math.max(d.cx, L + d.r + 2), L + PW - d.r - 2);
      d.cy = Math.min(Math.max(d.cy, T + d.r + 2), T + PH - d.r - 2);
    }
  }
  return n;
}

export function PortfolioMatrix({ data, onlyFocus, tip }: { data: PortfolioData; onlyFocus: boolean; tip: TipApi }) {
  const pts = data.points.filter((p) => p.recent.maturity !== null && (!onlyFocus || p.relevance === 3));
  const maxShare = Math.max(...pts.flatMap((p) => [p.recent.share, p.past.maturity !== null ? p.past.share : 0]), 0.05) * 1.15;
  // 양 끝 점이 축에 붙지 않게 가로 범위를 조금 넓힘
  const x = (m: number) => L + ((m + 0.05) / 1.1) * PW;
  const y = (s: number) => T + (1 - s / maxShare) * PH;
  const mx = x(data.median.maturity), my = y(data.median.share);

  const placed = useMemo(() => {
    const dots = relax(pts.map((p) => ({ p, tx: x(p.recent.maturity!), ty: y(p.recent.share), r: Math.min(22, 6 + Math.sqrt(p.recent.count) * 3) })));
    const taken: Box[] = dots.map((d) => ({ x0: d.cx - d.r, y0: d.cy - d.r, x1: d.cx + d.r, y1: d.cy + d.r }));
    const labels = new Map<string, { x: number; y: number; anchor: "start" | "end" | "middle" }>();
    for (const d of [...dots].sort((a, b) => b.p.recent.count - a.p.recent.count)) {
      const w = textW(d.p.name);
      // 옆 자리 → 위·아래 → 비스듬한 옆 자리 순서 (겹친 점은 이름표를 위아래로 비껴 둠)
      const side = (dir: 1 | -1, dy: number) => ({
        x: d.cx + dir * (d.r + 6), y: d.cy + 4 + dy, anchor: dir === 1 ? ("start" as const) : ("end" as const),
        box: dir === 1 ? { x0: d.cx + d.r + 4, y0: d.cy - 9 + dy, x1: d.cx + d.r + 8 + w, y1: d.cy + 8 + dy } : { x0: d.cx - d.r - 8 - w, y0: d.cy - 9 + dy, x1: d.cx - d.r - 4, y1: d.cy + 8 + dy },
      });
      const cands = [
        side(1, 0),
        side(-1, 0),
        { x: d.cx, y: d.cy - d.r - 7, anchor: "middle" as const, box: { x0: d.cx - w / 2 - 3, y0: d.cy - d.r - 21, x1: d.cx + w / 2 + 3, y1: d.cy - d.r - 4 } },
        { x: d.cx, y: d.cy + d.r + 16, anchor: "middle" as const, box: { x0: d.cx - w / 2 - 3, y0: d.cy + d.r + 3, x1: d.cx + w / 2 + 3, y1: d.cy + d.r + 20 } },
        side(-1, -18), side(-1, 18), side(1, -18), side(1, 18), side(-1, -36), side(-1, 36), side(1, -36), side(1, 36),
      ].filter((c) => c.box.x0 >= 0 && c.box.x1 <= W && c.box.y0 >= 0 && c.box.y1 <= T + PH);
      const own = (t: Box) => t.x0 === d.cx - d.r && t.y0 === d.cy - d.r;
      const ok = cands.find((c) => !taken.some((t) => !own(t) && hit(c.box, t))) ?? cands[0];
      if (ok) {
        taken.push(ok.box);
        labels.set(d.p.name, ok);
      }
    }
    // 실제 위치가 거의 같은 항목들 (툴팁에서 함께 보여 줌)
    const near = (d: (typeof dots)[number]) => dots.filter((o) => o !== d && Math.hypot(o.tx - d.tx, o.ty - d.ty) < 14).map((o) => o.p.name);
    return dots.map((d) => ({ ...d, label: labels.get(d.p.name), near: near(d), moved: Math.hypot(d.cx - d.tx, d.cy - d.ty) > 3 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pts.map((p) => p.name).join(), maxShare]);

  const Q = [
    { x: L + 10, y: T + 18, anchor: "start" as const, t: "기대 선행 · 실증으로 검증", s: "관심은 높고 도입 근거는 아직 적음" },
    { x: L + PW - 10, y: T + 18, anchor: "end" as const, t: "주류 · 도입 검토", s: "관심도 높고 도입 사례도 많음" },
    { x: L + 10, y: T + PH - 26, anchor: "start" as const, t: "관찰", s: "관심도 낮고 초기 단계" },
    { x: L + PW - 10, y: T + PH - 26, anchor: "end" as const, t: "안정 · 운영 최적화", s: "도입은 보편, 화제성은 낮음" },
  ];

  /**
   * 사분면 바탕 글씨 자리: 각 사분면 안 9곳 중 원·이름표와 가장 덜 겹치는 곳 (같으면 가운데 우선).
   * 원에 가려 안 보이는 일이 없게 한다.
   */
  const watermarks = useMemo(() => {
    const quads = [
      { x0: L, x1: mx, y0: T, y1: my, q: Q[0] },
      { x0: mx, x1: L + PW, y0: T, y1: my, q: Q[1] },
      { x0: L, x1: mx, y0: my, y1: T + PH, q: Q[2] },
      { x0: mx, x1: L + PW, y0: my, y1: T + PH, q: Q[3] },
    ];
    const obstacles: Box[] = placed.flatMap((d) => [
      { x0: d.cx - d.r - 4, y0: d.cy - d.r - 4, x1: d.cx + d.r + 4, y1: d.cy + d.r + 4 },
      ...(d.label ? [{ x0: d.label.anchor === "end" ? d.label.x - textW(d.p.name) : d.label.anchor === "middle" ? d.label.x - textW(d.p.name) / 2 : d.label.x, y0: d.label.y - 13, x1: d.label.anchor === "end" ? d.label.x : d.label.anchor === "middle" ? d.label.x + textW(d.p.name) / 2 : d.label.x + textW(d.p.name), y1: d.label.y + 4 }] : []),
    ]);
    const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    return quads.map(({ x0, x1, y0, y1, q }) => {
      const size = Math.min(30, Math.max(16, (x1 - x0) / 11));
      const w = Math.max([...q.t].length * size * 0.92, [...q.s].length * 13 * 0.9);
      const h = size + 22;
      let best = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 + size / 3, score: Infinity };
      for (const fy of [0.5, 0.3, 0.72, 0.18, 0.86])
        for (const fx of [0.5, 0.3, 0.7]) {
          const x = x0 + (x1 - x0) * fx;
          const y = y0 + (y1 - y0) * fy + size / 3;
          const box = { x0: x - w / 2, x1: x + w / 2, y0: y - size, y1: y - size + h };
          if (box.x0 < x0 + 4 || box.x1 > x1 - 4 || box.y0 < y0 + 4 || box.y1 > y1 - 4) continue;
          const score = obstacles.reduce((n, o) => n + overlap(box, o), 0);
          if (score < best.score - 1) best = { x, y, score };
        }
      return { x: best.x, y: best.y, size, q };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, mx, my]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`기술 포지션 맵: ${pts.map((p) => `${p.name} 성숙도 ${pp(p.recent.maturity!)} 관심도 ${pp(p.recent.share)}`).join(", ")}`}>
      <defs>
        <marker id="pf-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L8 4 L0 8 z" fill="#898781" />
        </marker>
        {/* 입체감: 원은 빛을 받은 구처럼(왼쪽 위 밝게) + 바닥 그림자 */}
        <filter id="pf-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1c1a19" floodOpacity="0.28" />
        </filter>
        <radialGradient id="pf-ball-focus" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#E2766F" />
          <stop offset="55%" stopColor="#A72B2B" />
          <stop offset="100%" stopColor="#6E1717" />
        </radialGradient>
        <radialGradient id="pf-ball-gray" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#D9D6D0" />
          <stop offset="55%" stopColor="#A9A7A0" />
          <stop offset="100%" stopColor="#77746E" />
        </radialGradient>
        {/* 사분면 바닥: 위쪽 오른쪽(주류)으로 갈수록 살짝 짙게 → 공간감 */}
        <linearGradient id="pf-floor" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F6EEEB" />
        </linearGradient>
      </defs>
      {/* 사분면: 배경 면 + 큰 워터마크 글씨 (설명이 바탕에 깔린 느낌) */}
      <rect x={L} y={T} width={PW} height={PH} fill="url(#pf-floor)" />
      <rect x={mx} y={T} width={L + PW - mx} height={my - T} fill="#A72B2B" fillOpacity="0.035" />
      {watermarks.map(({ x: wx, y: wy, size, q }) => (
        <g key={q.t} aria-hidden pointerEvents="none">
          <text x={wx} y={wy} textAnchor="middle" fontSize={size} fontWeight="800" fill="#1c1a19" fillOpacity="0.08" style={{ letterSpacing: "-0.5px" }}>
            {q.t}
          </text>
          <text x={wx} y={wy + size * 0.75} textAnchor="middle" fontSize="13" fill="#1c1a19" fillOpacity="0.28">{q.s}</text>
        </g>
      ))}
      <line x1={mx} x2={mx} y1={T} y2={T + PH} stroke="#c9c7c0" strokeDasharray="4 4" />
      <line x1={L} x2={L + PW} y1={my} y2={my} stroke="#c9c7c0" strokeDasharray="4 4" />
      {/* 축 */}
      <line x1={L} x2={L + PW} y1={T + PH} y2={T + PH} stroke="#9c9a93" />
      <line x1={L} x2={L} y1={T} y2={T + PH} stroke="#9c9a93" />
      {/* 눈금 = 신호 가중치 위치 (공개 0 · 투자 0.25 · 실증 0.6 · 도입 1) */}
      {([[0, "공개"], [0.25, "투자"], [0.6, "실증"], [1, "도입"]] as const).map(([v, t]) => (
        <g key={t}>
          <line x1={x(v)} x2={x(v)} y1={T + PH} y2={T + PH + 4} stroke="#9c9a93" />
          <text x={x(v)} y={T + PH + 18} textAnchor="middle" fontSize="11" fill="#898781">{t}</text>
        </g>
      ))}
      <text x={L + PW} y={T + PH + 42} textAnchor="end" fontSize="12" fill="#5c5755">성숙도 → (기사 속 공개·투자·실증·도입 신호의 가중 평균)</text>
      <text transform={`translate(${L - 44} ${T + PH / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="#5c5755">관심도 ↑ (추적 기술 언급 점유율)</text>
      {[0, maxShare / 2].map((v) => <text key={v} x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#898781">{pp(v)}</text>)}
      <text x={mx + 4} y={T + PH - 4} fontSize="10" fill="#898781">중앙값</text>

      {/* 이동 화살표 (지난 기간 → 최근) */}
      {placed.map(({ p, cx, cy, r }) =>
        p.past.maturity !== null && p.past.count > 0 ? (
          <g key={`m-${p.name}`} aria-hidden>
            <circle cx={x(p.past.maturity)} cy={y(p.past.share)} r={4} fill="#fff" stroke="#898781" strokeWidth="1.5" />
            {Math.hypot(cx - x(p.past.maturity), cy - y(p.past.share)) > r + 8 && (
              <line
                x1={x(p.past.maturity)}
                y1={y(p.past.share)}
                x2={cx - ((cx - x(p.past.maturity)) / Math.hypot(cx - x(p.past.maturity), cy - y(p.past.share))) * (r + 3)}
                y2={cy - ((cy - y(p.past.share)) / Math.hypot(cx - x(p.past.maturity), cy - y(p.past.share))) * (r + 3)}
                stroke="#898781"
                strokeWidth="1.4"
                markerEnd="url(#pf-arrow)"
              />
            )}
          </g>
        ) : null,
      )}
      {placed.map(({ p, cx, cy, r, label, near, moved, tx, ty }, i) => {
        const m = p.recent.maturity!;
        const quad = p.recent.share >= data.median.share ? (m >= data.median.maturity ? "주류 · 도입 검토" : "기대 선행 · 실증으로 검증") : m >= data.median.maturity ? "안정 · 운영 최적화" : "관찰";
        const body = (
          <TipCard
            title={p.name}
            badge={`CL 연관 ${p.relevance === 3 ? "높음" : p.relevance === 2 ? "중간" : "낮음"}`}
            badgeTone={p.relevance === 3 ? "brand" : "neutral"}
            sub={quad}
            stats={[
              { label: "성숙도", value: pp(m), delta: deltaOf(m, p.past.maturity, "%p") },
              { label: "관심도", value: pp(p.recent.share), delta: deltaOf(p.recent.share, p.past.count ? p.past.share : null, "%p") },
              { label: "최근 기사", value: `${p.recent.count}건`, delta: deltaOf(p.recent.count, p.past.count, "건") },
            ]}
          >
            {p.doubtShare >= 0.2 && <p className="font-bold text-[var(--rv-ink)]">! 신호의 {pp(p.doubtShare)}가 중단·지연 등 회의 신호</p>}
            {near.length > 0 && <p>같은 자리: <b className="text-[var(--rv-ink)]">{near.join(", ")}</b></p>}
            {moved && <p className="text-[var(--rv-mute)]">겹치지 않게 옮겨 그림 · 작은 점이 실제 위치</p>}
            <p className="text-[var(--rv-mute)]">변화는 지난 기간 대비</p>
          </TipCard>
        );
        return (
          <g key={p.name} tabIndex={0} className="pf-node outline-none" onPointerMove={(e) => tip.show(e, body)} onPointerLeave={tip.hide} onFocus={(e) => tip.show(e, body)} onBlur={tip.hide}>
            {moved && (
              <>
                <line x1={tx} y1={ty} x2={cx} y2={cy} stroke="#57524f" strokeWidth="1" strokeDasharray="2 2" />
                <circle cx={tx} cy={ty} r={2.5} fill="#57524f" />
              </>
            )}
            <circle cx={cx} cy={cy} r={r + 8} fill="transparent" />
            <circle cx={cx} cy={cy} r={r} fill={p.relevance === 3 ? "url(#pf-ball-focus)" : "url(#pf-ball-gray)"} stroke="#fff" strokeWidth="1.5" filter="url(#pf-shadow)" className="pf-dot pop-in" style={{ animationDelay: `${i * 40}ms` }} />
            {p.doubtShare >= 0.2 && <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">!</text>}
            {label && <text x={label.x} y={label.y} textAnchor={label.anchor} fontSize="12.5" fontWeight="700" fill="#232021" paintOrder="stroke" stroke="#fff" strokeWidth="4">{p.name}</text>}
          </g>
        );
      })}
    </svg>
  );
}
