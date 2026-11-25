"use client";

import { useMemo } from "react";
import { NEUTRALS } from "@/config/brand";
import type { PortfolioData, PortfolioPoint } from "@/lib/insights/compute";
import { TipRow, type useTip } from "@/components/report/parts";

type TipApi = ReturnType<typeof useTip>;

/** 강조 한 가지: CL사업 연관 높음 = 브랜드 레드, 나머지 = 회색 (색은 연관도에 붙고 순위에 따라 바뀌지 않음) */
export const FOCUS = "#A72B2B";
const colorOf = (p: PortfolioPoint) => (p.relevance === 3 ? FOCUS : NEUTRALS.mid);
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

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`기술 포지션 맵: ${pts.map((p) => `${p.name} 성숙도 ${pp(p.recent.maturity!)} 관심도 ${pp(p.recent.share)}`).join(", ")}`}>
      <defs>
        <marker id="pf-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L8 4 L0 8 z" fill="#898781" />
        </marker>
      </defs>
      {/* 사분면 */}
      <line x1={mx} x2={mx} y1={T} y2={T + PH} stroke="#c9c7c0" strokeDasharray="4 4" />
      <line x1={L} x2={L + PW} y1={my} y2={my} stroke="#c9c7c0" strokeDasharray="4 4" />
      {Q.map((q) => (
        <g key={q.t}>
          <text x={q.x} y={q.y} textAnchor={q.anchor} fontSize="13" fontWeight="700" fill="#5c5755">{q.t}</text>
          <text x={q.x} y={q.y + 16} textAnchor={q.anchor} fontSize="11" fill="#898781">{q.s}</text>
        </g>
      ))}
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
        const body = (
          <>
            <p className="font-bold">{p.name} <span className="font-normal text-[var(--rv-soft)]">· CL 연관 {p.relevance === 3 ? "높음" : p.relevance === 2 ? "중간" : "낮음"}</span></p>
            <TipRow value={pp(p.recent.maturity!)} label={`성숙도 (지난 기간 ${p.past.maturity === null ? "신호 없음" : pp(p.past.maturity)})`} />
            <TipRow value={pp(p.recent.share)} label={`관심도 (지난 기간 ${pp(p.past.share)})`} />
            <TipRow value={`${p.recent.count}건`} label={`최근 기간 기사 (지난 기간 ${p.past.count}건)`} />
            {p.doubtShare >= 0.2 && <p className="mt-1 font-bold text-[var(--rv-ink)]">▲ 주의: 신호의 {pp(p.doubtShare)}가 중단·지연 등 회의 신호</p>}
            {near.length > 0 && <p className="mt-1 text-[var(--rv-soft)]">같은 자리: <b className="text-[var(--rv-ink)]">{near.join(", ")}</b></p>}
            {moved && <p className="text-[var(--rv-mute)]">겹치지 않게 옮겨 그림 · 작은 점이 실제 위치</p>}
          </>
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
            <circle cx={cx} cy={cy} r={r} fill={colorOf(p)} fillOpacity={0.92} stroke="#fff" strokeWidth="2" className="pf-dot pop-in" style={{ animationDelay: `${i * 40}ms` }} />
            {p.doubtShare >= 0.2 && <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">!</text>}
            {label && <text x={label.x} y={label.y} textAnchor={label.anchor} fontSize="12.5" fontWeight="700" fill="#232021" paintOrder="stroke" stroke="#fff" strokeWidth="4">{p.name}</text>}
          </g>
        );
      })}
    </svg>
  );
}
