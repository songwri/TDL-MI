"use client";

import { useMemo } from "react";
import { NEUTRALS, RAMP } from "@/config/brand";
import { CURVE_STAGES, STAGE_SIGNALS, type StageKey } from "@/config/insights";
import type { HypePoint, InsightsData, Mover } from "@/lib/insights/compute";
import type { Indicator } from "@/lib/indicators";
import { TipRow, catColor, rampColor, type useTip } from "@/components/report/parts";

type TipApi = ReturnType<typeof useTip>;

/** 단계 신호 색: 성숙 순서대로 파랑이 진해지고, '리스크·과제'만 회색 (색과 함께 항상 이름 표시) */
export const SIGNAL_COLOR: Record<StageKey, string> = {
  launch: RAMP[1],
  invest: RAMP[2],
  doubt: NEUTRALS.mid,
  pilot: RAMP[4],
  adopt: RAMP[5],
};
export const SIGNAL_ORDER: StageKey[] = ["launch", "invest", "pilot", "adopt", "doubt"];
export const signalLabel = (k: StageKey) => STAGE_SIGNALS.find((s) => s.key === k)!.label;

export const pct = (m: number | null) => (m === null ? "신규" : `${m >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(m * 100))}%`);

/* ── 차트 툴팁 카드 (버블 공통) ───────────────────────── */

export interface TipStat {
  label: string;
  value: string;
  /** 지난 기간 대비 (예: "▲ 12%p"), 방향은 up/down/flat */
  delta?: { text: string; dir: "up" | "down" | "flat" };
}

/**
 * 툴팁 카드: 이름과 상태를 맨 위에, 핵심 숫자 3개를 큰 글씨로, 부가 설명은 맨 아래 작게.
 * 줄글로 늘어놓지 않아 한눈에 읽힌다.
 */
export function TipCard({ title, badge, badgeTone = "neutral", sub, stats, children }: { title: string; badge?: string; badgeTone?: "brand" | "neutral"; sub?: string; stats: TipStat[]; children?: React.ReactNode }) {
  return (
    <div className="w-[268px]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[15px] font-bold leading-tight text-[var(--rv-ink)]">{title}</p>
        {badge && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeTone === "brand" ? "bg-[var(--rv-tint)] text-[var(--rv-accent)]" : "bg-[#f1f0ec] text-[var(--rv-soft)]"}`}>{badge}</span>}
      </div>
      {sub && <p className="mt-0.5 text-[11px] font-bold text-[var(--rv-soft)]">{sub}</p>}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {stats.map((st) => (
          <div key={st.label} className="rounded-md bg-[#f6f5f2] px-2 py-1.5">
            <p className="text-[10px] text-[var(--rv-mute)]">{st.label}</p>
            <p className="font-display text-[15px] font-bold leading-tight tabular-nums text-[var(--rv-ink)]">{st.value}</p>
            {st.delta && <p className={`text-[10px] font-bold tabular-nums ${st.delta.dir === "up" ? "text-[var(--rv-accent)]" : "text-[var(--rv-mute)]"}`}>{st.delta.text}</p>}
          </div>
        ))}
      </div>
      {children && <div className="mt-2 space-y-1 border-t border-[var(--rv-line)] pt-2 text-[11px] text-[var(--rv-soft)]">{children}</div>}
    </div>
  );
}

/** 지난 기간 대비 변화 표시 */
export const deltaOf = (now: number, before: number | null, unit: "%p" | "건"): TipStat["delta"] => {
  if (before === null) return { text: "지난 기간 없음", dir: "flat" };
  const d = unit === "%p" ? Math.round((now - before) * 100) : now - before;
  return { text: d === 0 ? "변화 없음" : `${d > 0 ? "▲" : "▼"} ${Math.abs(d)}${unit}`, dir: d > 0 ? "up" : d < 0 ? "down" : "flat" };
};

/* ── 기술 성숙도 맵 (하이프 사이클 형식) ───────────────────────── */

const W = 960, H = 400, L = 56, R = 24, T = 28, B = 64;
const PW = W - L - R, PH = H - T - B;
const px = (x: number) => L + x * PW;
const py = (y: number) => T + (1 - y) * PH;

/** 글자 폭 추정 (한글 12.5px, 영문·숫자 7.4px) */
const textW = (t: string) => [...t].reduce((n, ch) => n + (/[\u3131-\uD79D]/.test(ch) ? 13.2 : 8), 0);
type Box = { x0: number; y0: number; x1: number; y1: number };
const hit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/**
 * 점 배치: 모든 점은 곡선 위 자기 실제 위치(x = 성숙도 판정, y = 곡선 높이)에 그대로 찍는다. 옮기지 않는다.
 * 같은 자리에 몰리면 큰 원을 아래, 작은 원을 위에 겹쳐 그리고(툴팁에 겹친 기술을 알려 줌), 이름표만 빈 자리로 피한다.
 * 이름표는 위·아래·오른쪽·왼쪽 중 다른 이름표·점과 겹치지 않는 자리에 둔다.
 */
function layoutPoints(points: HypePoint[], curve: (x: number) => number) {
  const sorted = [...points].sort((a, b) => a.x - b.x || b.count - a.count);
  const dots = sorted.map((p) => {
    const cx = px(p.x), cy = py(curve(p.x));
    const r = Math.min(11, 5 + Math.sqrt(p.count) * 1.1);
    return { p, cx, cy, tx: cx, ty: cy, r };
  });
  const taken: Box[] = dots.map((d) => ({ x0: d.cx - d.r - 2, y0: d.cy - d.r - 2, x1: d.cx + d.r + 2, y1: d.cy + d.r + 2 }));
  type Line = { x1: number; y1: number; x2: number; y2: number };
  const labels = new Map<string, { x: number; y: number; anchor: "middle" | "start" | "end"; line?: Line }>();
  // 이름표 놓는 순서: 기사 많은 것부터. 가까운 자리(위·아래·옆)를 먼저, 안 되면 멀리 띄우고 가는 선으로 잇는다
  for (const d of [...dots].sort((a, b) => b.p.count - a.p.count)) {
    const w = textW(d.p.name), h = 15;
    type Cand = { x: number; y: number; anchor: "middle" | "start" | "end"; box: Box; line?: Line };
    const near: Cand[] = [
      { x: d.cx, y: d.cy - d.r - 8, anchor: "middle", box: { x0: d.cx - w / 2, y0: d.cy - d.r - 8 - h + 3, x1: d.cx + w / 2, y1: d.cy - d.r - 5 } },
      { x: d.cx, y: d.cy + d.r + 16, anchor: "middle", box: { x0: d.cx - w / 2, y0: d.cy + d.r + 4, x1: d.cx + w / 2, y1: d.cy + d.r + 19 } },
      { x: d.cx + d.r + 6, y: d.cy + 4, anchor: "start", box: { x0: d.cx + d.r + 5, y0: d.cy - 8, x1: d.cx + d.r + 7 + w, y1: d.cy + 7 } },
      { x: d.cx - d.r - 6, y: d.cy + 4, anchor: "end", box: { x0: d.cx - d.r - 7 - w, y0: d.cy - 8, x1: d.cx - d.r - 5, y1: d.cy + 7 } },
    ];
    const far: Cand[] = [];
    for (const dist of [34, 52, 70, 90, 112, 136, 162]) {
      for (const dx of [0, -28, 28, -56, 56, -90, 90, -130, 130]) {
        for (const up of [true, false]) {
          const x = d.cx + dx, y = up ? d.cy - dist : d.cy + dist + 8;
          far.push({ x, y, anchor: "middle", box: { x0: x - w / 2, y0: y - h + 3, x1: x + w / 2, y1: y + 3 }, line: { x1: d.cx, y1: d.cy + (up ? -d.r : d.r), x2: x, y2: up ? y + 5 : y - 13 } });
        }
      }
    }
    const cands = [...near, ...far]
      .map((c): Cand => ({ ...c, box: { x0: c.box.x0 - 4, y0: c.box.y0 - 1, x1: c.box.x1 + 4, y1: c.box.y1 + 1 } }))
      // 화면 안, 그리고 아래 단계 이름 줄(가로축 아래)은 비워 둔다
      .filter((c) => c.box.x0 >= 0 && c.box.x1 <= W && c.box.y0 >= 0 && c.box.y1 <= T + PH + 4);
    const own = { x0: d.cx - d.r - 2, y0: d.cy - d.r - 2 };
    // 이름표 상자도, 그 선도 다른 점·이름표 위를 지나지 않아야 한다 (선은 점에서 벗어난 뒤 구간만 확인: 몰려 있는 점 위에서 출발하는 것은 막지 않는다)
    const lineClear = (ln?: Line) => !ln || Array.from({ length: 6 }, (_, i) => 0.45 + i * 0.11).every((t) => {
      const x = ln.x1 + (ln.x2 - ln.x1) * t, y = ln.y1 + (ln.y2 - ln.y1) * t;
      return !taken.some((b) => !(b.x0 === own.x0 && b.y0 === own.y0) && x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1);
    });
    const ok = cands.find((c) => !taken.some((t) => !(t.x0 === own.x0 && t.y0 === own.y0) && hit(c.box, t)) && lineClear(c.line)) ?? cands[0];
    taken.push(ok.box);
    labels.set(d.p.name, { x: ok.x, y: ok.y, anchor: ok.anchor, line: ok.line });
  }
  return dots.map((d) => ({ ...d, label: labels.get(d.p.name)! }));
}

export function HypeMap({ points, curve, selected, onSelect, tip }: { points: HypePoint[]; curve: (x: number) => number; selected?: string; onSelect: (name: string) => void; tip: TipApi }) {
  const path = useMemo(() => Array.from({ length: 101 }, (_, i) => `${i ? "L" : "M"}${px(i / 100).toFixed(1)} ${py(curve(i / 100)).toFixed(1)}`).join(" "), [curve]);
  const placed = useMemo(() => layoutPoints(points, curve), [points, curve]);
  /** 단계 이름(바탕 글씨) 높이: 곡선·점·이름표와 겹치지 않는 자리 (위 → 가운데 → 아래 순서로 찾음) */
  /** 그리는 순서: 큰 원이 아래, 작은 원이 위 (작은 원도 마우스가 닿게) */
  const drawOrder = useMemo(() => [...placed].sort((a, b) => b.r - a.r), [placed]);
  const stageMarkY = useMemo(
    () =>
      CURVE_STAGES.map((st) => {
        const xa = px(st.from) + 8, xb = px(st.to) - 8;
        const curveYs = Array.from({ length: 24 }, (_, k) => py(curve(st.from + ((st.to - st.from) * k) / 23)));
        const free = (y: number) => {
          const top = y - 22, bottom = y + 6;
          if (curveYs.some((cy) => cy > top - 6 && cy < bottom + 6)) return false;
          return !placed.some((d) => d.cx + d.r > xa && d.cx - d.r < xb && d.cy + d.r + 20 > top && d.cy - d.r - 22 < bottom);
        };
        return [T + 34, T + 70, T + PH * 0.45, T + PH * 0.62, T + PH - 10].find(free) ?? T + PH - 10;
      }),
    [curve, placed],
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`기술 성숙도 맵: ${points.map((p) => `${p.name} ${p.stage}`).join(", ")}`}>
      <defs>
        {/* 입체감: 곡선 아래 면 그라데이션, 곡선·점 그림자, 빛을 받은 구 */}
        <linearGradient id="hm-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1a19" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#1c1a19" stopOpacity="0" />
        </linearGradient>
        <filter id="hm-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.6" floodColor="#1c1a19" floodOpacity="0.28" />
        </filter>
        <filter id="hm-line-shadow" x="-5%" y="-20%" width="110%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#1c1a19" floodOpacity="0.18" />
        </filter>
        <radialGradient id="hm-shine" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* 단계 구간: 번갈아 옅은 면 + 바탕에 큰 단계 이름 (설명이 깔린 느낌) */}
      {CURVE_STAGES.map((s, i) => (
        <g key={s.label}>
          {i % 2 === 1 && <rect x={px(s.from)} y={T} width={px(s.to) - px(s.from)} height={PH} fill="#1c1a19" fillOpacity="0.025" />}
          {i > 0 && <line x1={px(s.from)} x2={px(s.from)} y1={T} y2={T + PH} stroke="#e1e0d9" strokeDasharray="3 4" />}
          <text aria-hidden x={px((s.from + s.to) / 2)} y={stageMarkY[i]} textAnchor="middle" fontSize="24" fontWeight="800" fill="#1c1a19" fillOpacity="0.09" pointerEvents="none">{s.label}</text>
          <text x={px((s.from + s.to) / 2)} y={T + PH + 24} textAnchor="middle" fontSize="13" fontWeight="700" fill="#5c5755">{s.label}</text>
        </g>
      ))}
      <line x1={L} x2={L + PW} y1={T + PH} y2={T + PH} stroke="#c9c7c0" />
      <text x={L + PW} y={T + PH + 48} textAnchor="end" fontSize="12" fill="#898781">성숙도 (기사 속 공개 → 투자 → 실증 → 도입 신호) →</text>
      <text transform={`translate(${L - 30} ${T + PH / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="#898781">관심·기대 ↑</text>
      <path d={`${path} L${px(1)} ${T + PH} L${px(0)} ${T + PH} Z`} fill="url(#hm-area)" />
      <path d={path} pathLength={1} fill="none" stroke="#232021" strokeWidth="2.5" opacity="0.85" className="draw-in" filter="url(#hm-line-shadow)" />
      {(() => {
        // 이름표 층(아래)과 원 층(위)으로 나눠 그린다. 두 층 모두 같은 툴팁·클릭(선택)을 쓰되, 겹치는 곳에서는 항상 원이 마우스를 받는다
        const items = drawOrder.map((d, idx) => {
          const { p } = d;
          const stacked = points.filter((q) => q !== p && Math.hypot(px(q.x) - d.cx, py(curve(q.x)) - d.cy) < d.r + 4).map((q) => q.name);
          const peers = points.filter((q) => q !== p && q.stage === p.stage).map((q) => q.name);
          const color = catColor(p.category);
          const sel = p.name === selected;
          const body = (
            <TipCard
              title={p.name}
              badge={p.stage}
              badgeTone="brand"
              sub={`${p.category}${p.confident ? "" : " · 신호 3건 미만"}`}
              stats={[
                { label: "기간 내 기사", value: `${p.count}건` },
                { label: "최근 30일", value: `${p.recent}건` },
                { label: "속도 (이전 대비)", value: p.momentum === null ? "신규" : `${p.momentum >= 0 ? "+" : "−"}${Math.abs(Math.round(p.momentum * 100))}%` },
              ]}
            >
              {p.signalTotal > 0 && (
                <>
                  <div className="flex h-1.5 gap-[2px] overflow-hidden rounded-full">
                    {SIGNAL_ORDER.filter((k) => p.signals[k]).map((k) => <span key={k} style={{ flex: p.signals[k], background: SIGNAL_COLOR[k] }} />)}
                  </div>
                  <p className="flex flex-wrap gap-x-2">
                    {SIGNAL_ORDER.filter((k) => p.signals[k]).map((k) => <span key={k}><span style={{ color: SIGNAL_COLOR[k] }}>■</span> {signalLabel(k)} <b className="text-[var(--rv-ink)]">{p.signals[k]}</b></span>)}
                  </p>
                </>
              )}
              <p><b className="text-[var(--rv-ink)]">판정 근거</b> {p.why}</p>
              {peers.length > 0 && <p>같은 단계: <b className="text-[var(--rv-ink)]">{peers.slice(0, 6).join(", ")}{peers.length > 6 ? ` 외 ${peers.length - 6}` : ""}</b></p>}
              {stacked.length > 0 && <p>같은 자리에 겹침: <b className="text-[var(--rv-ink)]">{stacked.join(", ")}</b></p>}
              <p className="text-[var(--rv-mute)]">누르면 근거 기사</p>
            </TipCard>
          );
          return { ...d, idx, body, color, sel };
        });
        const pick = (name: string) => ({
          onClick: () => onSelect(name),
          onPointerLeave: tip.hide,
        });
        return (
          <>
            {items.map(({ p, label, body, sel }) => (
              <g key={`l-${p.name}`} pointerEvents="none">
                {label.line && <line x1={label.line.x1} y1={label.line.y1} x2={label.line.x2} y2={label.line.y2} stroke="#898781" strokeWidth="1" />}
                <text x={label.x} y={label.y} textAnchor={label.anchor} fontSize="12.5" fontWeight={sel ? 800 : 600} fill="#232021" paintOrder="stroke" stroke="#fff" strokeWidth="4" pointerEvents="all" style={{ cursor: "pointer" }} onPointerMove={(e) => tip.show(e, body)} {...pick(p.name)}>
                  {p.name}
                </text>
              </g>
            ))}
            {items.map(({ p, cx, cy, r, idx, body, color, sel }) => (
              <g
                key={`b-${p.name}`}
                data-name={p.name}
                role="button"
                tabIndex={0}
                aria-label={`${p.name}: ${p.stage}, 기사 ${p.count}건`}
                // 묶음 자체는 마우스를 받지 않고, 원(공)만 받는다
                pointerEvents="none"
                className="outline-none"
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(p.name)}
                onPointerMove={(e) => tip.show(e, body)}
                onFocus={(e) => tip.show(e, body)}
                onBlur={tip.hide}
                {...pick(p.name)}
              >
                {sel && <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke="#232021" strokeWidth="2" />}
                <circle cx={cx} cy={cy} r={r} fill={p.confident ? color : "#fff"} stroke={p.confident ? "#fff" : color} strokeWidth={p.confident ? 2 : 2.5} className="pop-in" pointerEvents="all" style={{ animationDelay: `${300 + idx * 45}ms`, cursor: "pointer" }} filter="url(#hm-shadow)" />
                {p.confident && <circle cx={cx} cy={cy} r={r} fill="url(#hm-shine)" pointerEvents="none" className="pop-in" style={{ animationDelay: `${300 + idx * 45}ms` }} />}
              </g>
            ))}
          </>
        );
      })()}
    </svg>
  );
}

/** 단계 신호 구성 막대 (선택한 기술) */
export function SignalBar({ p, tip }: { p: HypePoint; tip: TipApi }) {
  const items = SIGNAL_ORDER.filter((k) => p.signals[k] > 0);
  if (!p.signalTotal) return <p className="text-sm text-[var(--rv-mute)]">기사에서 단계 신호(공개·투자·실증·도입·리스크)를 찾지 못했습니다. 언급만 있는 상태로 보고 &lsquo;기술 태동&rsquo;에 둡니다.</p>;
  return (
    <div>
      <div className="flex h-7 gap-[2px] overflow-hidden rounded-[4px]">
        {items.map((k) => (
          <div
            key={k}
            tabIndex={0}
            className="rv-seg flex items-center justify-center text-[11px] font-bold"
            style={{ flex: p.signals[k], background: SIGNAL_COLOR[k], color: k === "launch" || k === "invest" ? "#0b0b0b" : "#fff" }}
            onPointerMove={(e) => tip.show(e, <TipRow value={`${p.signals[k]}건`} label={signalLabel(k)} color={SIGNAL_COLOR[k]} />)}
            onPointerLeave={tip.hide}
            onFocus={(e) => tip.show(e, <TipRow value={`${p.signals[k]}건`} label={signalLabel(k)} color={SIGNAL_COLOR[k]} />)}
            onBlur={tip.hide}
          >
            {p.signals[k]}
          </div>
        ))}
      </div>
      <SignalLegend />
    </div>
  );
}

export const SignalLegend = () => (
  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--rv-soft)]">
    {SIGNAL_ORDER.map((k) => (
      <span key={k} className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: SIGNAL_COLOR[k] }} />
        {signalLabel(k)}
      </span>
    ))}
  </div>
);

/* ── 기사 구성 원그래프 (대표 신호) ───────────────────────── */

export const MIX_COLOR: Record<StageKey | "none", string> = { ...SIGNAL_COLOR, none: "#e4e0dc" };
export const mixLabel = (k: StageKey | "none") => (k === "none" ? "신호 없음" : signalLabel(k));

const arc = (cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) => {
  const p = (r: number, a: number) => `${cx + r * Math.sin(a)} ${cy - r * Math.cos(a)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`;
};

/** 원그래프 (가운데가 빈 도넛). 조각을 누르면 onPick, 선택 조각은 바깥으로 살짝 나온다 */
export function SignalDonut({ mix, selected, onPick, tip }: { mix: { key: StageKey | "none"; count: number }[]; selected?: StageKey | "none"; onPick: (k?: StageKey | "none") => void; tip: TipApi }) {
  const total = mix.reduce((n, m) => n + m.count, 0);
  const S = 240, C = S / 2, R1 = 108, R0 = 66;
  let a = 0;
  const parts = mix.filter((m) => m.count > 0).map((m) => {
    const a0 = a;
    a += (m.count / Math.max(total, 1)) * Math.PI * 2;
    return { ...m, a0, a1: a };
  });
  const sel = parts.find((p) => p.key === selected);
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="block h-auto w-full max-w-[260px]" role="img" aria-label={`기사 구성: ${parts.map((p) => `${mixLabel(p.key)} ${p.count}건`).join(", ")}`}>
      <g className="pop-in">
        {parts.length === 1 ? (
          <circle cx={C} cy={C} r={(R0 + R1) / 2} fill="none" stroke={MIX_COLOR[parts[0].key]} strokeWidth={R1 - R0} />
        ) : (
          parts.map((p) => {
            const mid = (p.a0 + p.a1) / 2;
            const on = p.key === selected;
            const dx = on ? Math.sin(mid) * 7 : 0, dy = on ? -Math.cos(mid) * 7 : 0;
            // 이름이 가장 눈에 띄게, 그다음 건수·비율
            const body = (
              <>
                <p className="flex items-center gap-2 text-[15px] font-bold leading-tight text-[var(--rv-ink)]">
                  <span aria-hidden className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: MIX_COLOR[p.key] }} />
                  {mixLabel(p.key)}
                </p>
                <p className="mt-0.5 pl-5 text-sm tabular-nums text-[var(--rv-soft)]">
                  {p.count}건 · {Math.round((p.count / total) * 100)}%
                </p>
              </>
            );
            return (
              <path
                key={p.key}
                d={arc(C, C, R0, R1, p.a0, p.a1)}
                fill={MIX_COLOR[p.key]}
                stroke="#fff"
                strokeWidth="2"
                tabIndex={0}
                role="button"
                aria-pressed={on}
                aria-label={`${mixLabel(p.key)} ${p.count}건`}
                className="cursor-pointer outline-none transition-transform duration-300 ease-out"
                style={{ transform: `translate(${dx}px, ${dy}px)`, opacity: selected && !on ? 0.45 : 1 }}
                onClick={() => onPick(on ? undefined : p.key)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPick(on ? undefined : p.key)}
                onPointerMove={(e) => tip.show(e, body)}
                onPointerLeave={tip.hide}
                onFocus={(e) => tip.show(e, body)}
                onBlur={tip.hide}
              />
            );
          })
        )}
      </g>
      <text x={C} y={C - 4} textAnchor="middle" className="font-display" fontSize="34" fontWeight="800" fill="#1c1a19">{sel ? sel.count : total}</text>
      <text x={C} y={C + 20} textAnchor="middle" fontSize="12" fill="#57524f">{sel ? `${mixLabel(sel.key)} · ${Math.round((sel.count / total) * 100)}%` : "분석 기간 기사"}</text>
    </svg>
  );
}

/* ── 작은 막대 (주별 기사 수) ───────────────────────────── */

export function Spark({ values, color = RAMP[4] }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  const bw = 7, gap = 2, h = 22;
  return (
    <svg width={values.length * (bw + gap) - gap} height={h} aria-hidden className="shrink-0">
      {values.map((v, i) => {
        const bh = v ? Math.max(3, (v / max) * h) : 1;
        return <rect key={i} x={i * (bw + gap)} y={h - bh} width={bw} height={bh} rx={v ? 1.5 : 0} fill={v ? color : "#e1e0d9"} />;
      })}
    </svg>
  );
}

export function MoverList({ rows, tip, empty }: { rows: Mover[]; tip: TipApi; empty: string }) {
  if (!rows.length) return <p className="py-3 text-sm text-[var(--rv-mute)]">{empty}</p>;
  return (
    <ul className="divide-y divide-[var(--rv-line)]">
      {rows.map((m) => {
        const body = (
          <>
            <p className="font-bold">{m.name}</p>
            <TipRow value={`${m.recent}건`} label="최근 14일" />
            <TipRow value={`${m.expected}건`} label="이전 8주 속도로 예상한 14일 기사 수" />
            <p className="mt-1 text-[var(--rv-soft)]">막대: 최근 8주 주별 기사 수</p>
          </>
        );
        return (
          <li key={m.name} tabIndex={0} className="flex items-center gap-3 py-2 hover:bg-[var(--rv-tint)]" onPointerMove={(e) => tip.show(e, body)} onPointerLeave={tip.hide} onFocus={(e) => tip.show(e, body)} onBlur={tip.hide}>
            <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
            <Spark values={m.weeks} />
            <span className="w-14 text-right text-sm font-bold tabular-nums">{m.recent}건</span>
            <span className={`w-16 text-right text-xs font-bold tabular-nums ${m.delta > 0 ? "text-[var(--rv-ink)]" : "text-[var(--rv-mute)]"}`}>{m.delta > 0 ? "+" : ""}{m.delta}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ── 주간 카테고리 흐름 ───────────────────────────── */

export function WeeklyBars({ weekly, tip }: { weekly: InsightsData["weekly"]; tip: TipApi }) {
  const totals = weekly.weeks.map((_, i) => weekly.series.reduce((n, s) => n + s.counts[i], 0));
  const max = Math.max(...totals, 1);
  const w = 960, h = 220, top = 20, bottom = 26, gap = 14;
  const bw = (w - gap * (weekly.weeks.length - 1)) / weekly.weeks.length;
  const ph = h - top - bottom;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" role="img" aria-label={`주간 카테고리 흐름: ${weekly.weeks.map((wk, i) => `${wk.label}주 ${totals[i]}건`).join(", ")}`}>
      <line x1={0} x2={w} y1={top + ph} y2={top + ph} stroke="#c9c7c0" />
      {weekly.weeks.map((wk, i) => {
        const x = i * (bw + gap);
        let y = top + ph;
        const segs = weekly.series.filter((s) => s.counts[i] > 0);
        return (
          <g key={wk.start}>
            {segs.map((s, j) => {
              const sh = (s.counts[i] / max) * ph;
              y -= sh;
              const isTop = j === segs.length - 1;
              const body = <><p className="font-bold">{wk.label}주 (월요일 시작)</p><TipRow value={`${s.counts[i]}건`} label={s.category} color={catColor(s.category)} /><TipRow value={`${totals[i]}건`} label="그 주 전체" /></>;
              return (
                <rect
                  key={s.category}
                  tabIndex={0}
                  className="rv-seg"
                  x={x}
                  y={y + (j ? 0 : 0)}
                  width={bw}
                  height={Math.max(1, sh - 2)}
                  rx={isTop ? 4 : 0}
                  fill={catColor(s.category)}
                  onPointerMove={(e) => tip.show(e, body)}
                  onPointerLeave={tip.hide}
                  onFocus={(e) => tip.show(e, body)}
                  onBlur={tip.hide}
                />
              );
            })}
            {totals[i] > 0 && <text x={x + bw / 2} y={top + ph - (totals[i] / max) * ph - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#5c5755">{totals[i]}</text>}
            <text x={x + bw / 2} y={h - 6} textAnchor="middle" fontSize="12" fill="#898781">{wk.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── 동종사 레이더 ───────────────────────────── */

/**
 * 동종업계 레이더: 줄 = 기업, 칸 = 단계 신호별 기사 수.
 * 줄에 마우스를 올리면 테두리가 강조되고, 누르면 그 회사 기사 목록이 아래에 열린다.
 */
export function PeerBoard({
  peers,
  selected,
  signal,
  onSelect,
  tip,
}: {
  peers: InsightsData["peers"];
  selected?: string;
  /** 선택한 칸의 신호 (없으면 그 회사 전체 기사) */
  signal?: StageKey;
  onSelect: (name?: string, signal?: StageKey) => void;
  tip: TipApi;
}) {
  const max = Math.max(...peers.flatMap((p) => SIGNAL_ORDER.map((k) => p.signals[k])), 1);
  const cols = "grid-cols-[minmax(140px,1.4fr)_repeat(5,minmax(64px,1fr))_64px]";
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]" role="group" aria-label="기업별 단계 신호 기사 수">
        <div className={`grid ${cols} gap-[2px] px-1 pb-1 text-xs font-bold text-[var(--rv-soft)]`}>
          <span className="px-2">기업</span>
          {SIGNAL_ORDER.map((k) => <span key={k} className="text-center">{signalLabel(k)}</span>)}
          <span className="text-center">전체</span>
        </div>
        <div className="space-y-1">
          {peers.map((p) => {
            const on = p.name === selected;
            return (
              <div
                key={p.name}
                className={`peer-row grid w-full ${cols} items-stretch gap-[2px] rounded-md border-2 p-[2px] text-sm transition-[border-color,box-shadow] ${on ? "border-[var(--rv-ink)] shadow-[0_6px_18px_-12px_rgb(28_26_25/0.6)]" : "border-transparent hover:border-[var(--rv-ink)]"}`}
              >
                <button
                  type="button"
                  aria-expanded={on && !signal}
                  title="이 회사 기사 전체 보기"
                  onClick={() => onSelect(on && !signal ? undefined : p.name)}
                  className={`flex items-center gap-1.5 rounded-[3px] px-2 py-1.5 text-left ${p.self ? "bg-[var(--rv-tint)] font-bold" : "hover:bg-[var(--wash)]"} ${on && !signal ? "ring-2 ring-inset ring-[var(--rv-ink)]" : ""}`}
                >
                  {p.self && <span aria-hidden className="h-4 w-1 rounded-full bg-[var(--rv-accent)]" />}
                  {p.name}
                  {p.self && <span className="rounded bg-[var(--rv-accent)] px-1 py-px text-[10px] font-bold text-white">자사</span>}
                  <span aria-hidden className={`ml-auto text-[var(--rv-mute)] transition-transform ${on ? "rotate-180" : ""}`}>▾</span>
                </button>
                {SIGNAL_ORDER.map((k) => {
                  const v = p.signals[k];
                  const bg = rampColor(v, max);
                  const cellOn = on && signal === k;
                  return (
                    <button
                      type="button"
                      key={k}
                      disabled={!v}
                      aria-pressed={cellOn}
                      aria-label={`${p.name} ${signalLabel(k)} ${v}건`}
                      onClick={() => onSelect(cellOn ? undefined : p.name, cellOn ? undefined : k)}
                      className={`flex items-center justify-center rounded-[3px] text-xs font-bold tabular-nums transition-transform enabled:cursor-pointer enabled:hover:scale-[1.04] ${cellOn ? "ring-[3px] ring-inset ring-[var(--rv-accent)]" : ""}`}
                      style={{ background: bg, color: v && (RAMP as readonly string[]).indexOf(bg) >= 3 ? "#fff" : "#232021" }}
                      onPointerMove={(e) => tip.show(e, <><TipRow value={`${v}건`} label={`${p.name} · ${signalLabel(k)}`} color={SIGNAL_COLOR[k]} />{v > 0 && <p className="mt-1 text-[var(--rv-soft)]">누르면 이 칸의 기사만 봅니다</p>}</>)}
                      onPointerLeave={tip.hide}
                    >
                      {v || ""}
                    </button>
                  );
                })}
                <span className="flex items-center justify-center text-xs font-bold tabular-nums text-[var(--rv-soft)]">{p.total}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[var(--rv-soft)]">
          <span>적음</span>
          {RAMP.map((c) => <span key={c} aria-hidden className="inline-block h-2.5 w-4 rounded-[2px]" style={{ background: c }} />)}
          <span>많음</span>
          <span className="ml-3">칸 = 그 기업이 언급된 기사 중 해당 신호가 있는 기사 수 · 회사명을 누르면 전체 기사, 칸을 누르면 그 칸의 기사만</span>
        </div>
      </div>
    </div>
  );
}

/* ── 공개 지표 ───────────────────────────── */

export function IndicatorCard({ ind, tip }: { ind: Indicator; tip: TipApi }) {
  const pts = ind.points.slice(-36);
  const w = 280, h = 64;
  const vals = pts.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const x = (i: number) => (i / Math.max(pts.length - 1, 1)) * (w - 8) + 4;
  const y = (v: number) => h - 6 - ((v - min) / Math.max(max - min, 1e-9)) * (h - 12);
  return (
    <div className="rounded-md border border-[var(--rv-line)] bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{ind.name}</p>
          <p className="text-xs text-[var(--rv-mute)]">{ind.note}</p>
        </div>
        <a href={ind.source} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] text-[var(--rv-soft)] underline">FRED {ind.id}</a>
      </div>
      {ind.latest ? (
        <>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">{ind.latest.value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}</span>
            {ind.yoy != null && <span className="text-xs font-bold tabular-nums">{ind.yoy >= 0 ? "▲" : "▼"} {Math.abs(ind.yoy)}% <span className="font-normal text-[var(--rv-mute)]">전년 동월 대비</span></span>}
          </div>
          <p className="text-[11px] text-[var(--rv-mute)]">{ind.latest.date.slice(0, 7)} 기준 · {ind.unit}</p>
          <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 block h-auto w-full" role="img" aria-label={`${ind.name} 최근 ${pts.length}개월 추이`}>
            <polyline points={pts.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} fill="none" stroke={RAMP[4]} strokeWidth="2" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <circle key={p.date} cx={x(i)} cy={y(p.value)} r={i === pts.length - 1 ? 4 : 7} fill={i === pts.length - 1 ? RAMP[5] : "transparent"} stroke={i === pts.length - 1 ? "#fff" : "none"} strokeWidth="2"
                onPointerMove={(e) => tip.show(e, <TipRow value={p.value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })} label={p.date.slice(0, 7)} color={RAMP[4]} />)} onPointerLeave={tip.hide} />
            ))}
          </svg>
        </>
      ) : (
        <p className="mt-4 rounded border border-dashed border-[var(--rv-line)] p-3 text-center text-xs text-[var(--rv-mute)]">아직 받은 값이 없습니다. 매일 새벽 기사 수집 때 함께 받아 옵니다.</p>
      )}
    </div>
  );
}
