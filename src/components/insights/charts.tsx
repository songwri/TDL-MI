"use client";

import { useMemo } from "react";
import { NEUTRALS, RAMP } from "@/config/brand";
import { CURVE_STAGES, STAGE_SIGNALS, type StageKey } from "@/config/insights";
import type { HypePoint, InsightsData, Mover } from "@/lib/insights/compute";
import type { Indicator } from "@/lib/indicators";
import { TipRow, catColor, rampColor, type useTip } from "@/components/report/parts";

type TipApi = ReturnType<typeof useTip>;

/** 단계 신호 색: 성숙 순서대로 파랑이 진해지고, '회의·과제'만 회색 (색과 함께 항상 이름 표시) */
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

/* ── 기술 성숙도 맵 (하이프 사이클 형식) ───────────────────────── */

const W = 960, H = 400, L = 56, R = 24, T = 28, B = 64;
const PW = W - L - R, PH = H - T - B;
const px = (x: number) => L + x * PW;
const py = (y: number) => T + (1 - y) * PH;

const MIN_GAP = 0.045;
/** 글자 폭 추정 (한글 12.5px, 영문·숫자 7.4px) */
const textW = (t: string) => [...t].reduce((n, ch) => n + (/[\u3131-\uD79D]/.test(ch) ? 13.2 : 8), 0);
type Box = { x0: number; y0: number; x1: number; y1: number };
const hit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/**
 * 점 배치: 같은 단계에 몰린 점은 무리 가운데를 기준으로 곡선을 따라 좌우로 벌리고(값은 툴팁·표에서 그대로),
 * 이름표는 위·아래·오른쪽·왼쪽 중 다른 이름표·점과 겹치지 않는 자리에 둔다.
 */
function layoutPoints(points: HypePoint[], curve: (x: number) => number) {
  const sorted = [...points].sort((a, b) => a.x - b.x || b.count - a.count);
  const xs = sorted.map((p) => p.x);
  for (let pass = 0; pass < 4; pass++) {
    let i = 0;
    while (i < xs.length) {
      let j = i;
      while (j + 1 < xs.length && xs[j + 1] - xs[j] < MIN_GAP - 1e-6) j++;
      if (j > i) {
        const k = j - i + 1;
        const mean = xs.slice(i, j + 1).reduce((a, b) => a + b, 0) / k;
        let start = mean - ((k - 1) / 2) * MIN_GAP;
        start = Math.min(Math.max(start, 0.02), 0.98 - (k - 1) * MIN_GAP);
        for (let m = 0; m < k; m++) xs[i + m] = start + m * MIN_GAP;
      }
      i = j + 1;
    }
  }
  const dots = sorted.map((p, i) => {
    const cx = px(xs[i]), cy = py(curve(xs[i]));
    return { p, cx, cy, r: Math.min(17, 5 + Math.sqrt(p.count) * 2.6) };
  });
  const taken: Box[] = dots.map((d) => ({ x0: d.cx - d.r - 2, y0: d.cy - d.r - 2, x1: d.cx + d.r + 2, y1: d.cy + d.r + 2 }));
  const order = [...dots].sort((a, b) => b.p.count - a.p.count);
  const labels = new Map<string, { x: number; y: number; anchor: "middle" | "start" | "end"; lead?: number }>();
  for (const d of order) {
    const w = textW(d.p.name), h = 15;
    type Cand = { x: number; y: number; anchor: "middle" | "start" | "end"; box: Box; lead?: boolean };
    const above = (off: number): Cand => ({ x: d.cx, y: d.cy - d.r - off, anchor: "middle", box: { x0: d.cx - w / 2, y0: d.cy - d.r - off - h + 3, x1: d.cx + w / 2, y1: d.cy - d.r - off + 3 }, lead: off > 10 });
    const base: Cand[] = [
      above(8),
      { x: d.cx, y: d.cy + d.r + 16, anchor: "middle", box: { x0: d.cx - w / 2, y0: d.cy + d.r + 4, x1: d.cx + w / 2, y1: d.cy + d.r + 19 } },
      { x: d.cx + d.r + 6, y: d.cy + 4, anchor: "start", box: { x0: d.cx + d.r + 5, y0: d.cy - 8, x1: d.cx + d.r + 7 + w, y1: d.cy + 7 } },
      { x: d.cx - d.r - 6, y: d.cy + 4, anchor: "end", box: { x0: d.cx - d.r - 7 - w, y0: d.cy - 8, x1: d.cx - d.r - 5, y1: d.cy + 7 } },
      above(26), above(44), above(62), above(80), above(98),
    ];
    const cands = base
      .map((c): Cand => ({ ...c, box: { x0: c.box.x0 - 4, y0: c.box.y0 - 1, x1: c.box.x1 + 4, y1: c.box.y1 + 1 } }))
      // 화면 안, 그리고 아래 단계 이름 줄(가로축 아래)은 비워 둔다
      .filter((c) => c.box.x0 >= 0 && c.box.x1 <= W && c.box.y0 >= 0 && c.box.y1 <= T + PH + 4);
    const own: Box = { x0: d.cx - d.r - 2, y0: d.cy - d.r - 2, x1: d.cx + d.r + 2, y1: d.cy + d.r + 2 };
    const ok = cands.find((c) => !taken.some((t) => t !== own && !(t.x0 === own.x0 && t.y0 === own.y0) && hit(c.box, t))) ?? cands[0];
    taken.push(ok.box);
    // 위로 띄운 이름표는 점까지 가는 가는 선을 그어 어느 점인지 보이게 한다
    if (ok.lead) taken.push({ x0: d.cx - 1, y0: ok.box.y1, x1: d.cx + 1, y1: d.cy - d.r });
    labels.set(d.p.name, { x: ok.x, y: ok.y, anchor: ok.anchor, lead: ok.lead ? ok.y + 4 : undefined });
  }
  return dots.map((d) => ({ ...d, label: labels.get(d.p.name)! }));
}

export function HypeMap({ points, curve, selected, onSelect, tip }: { points: HypePoint[]; curve: (x: number) => number; selected?: string; onSelect: (name: string) => void; tip: TipApi }) {
  const path = useMemo(() => Array.from({ length: 101 }, (_, i) => `${i ? "L" : "M"}${px(i / 100).toFixed(1)} ${py(curve(i / 100)).toFixed(1)}`).join(" "), [curve]);
  const placed = useMemo(() => layoutPoints(points, curve), [points, curve]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`기술 성숙도 맵: ${points.map((p) => `${p.name} ${p.stage}`).join(", ")}`}>
      {/* 단계 구간 */}
      {CURVE_STAGES.map((s, i) => (
        <g key={s.label}>
          {i > 0 && <line x1={px(s.from)} x2={px(s.from)} y1={T} y2={T + PH} stroke="#e1e0d9" strokeDasharray="3 4" />}
          <text x={px((s.from + s.to) / 2)} y={T + PH + 24} textAnchor="middle" fontSize="13" fontWeight="700" fill="#5c5755">{s.label}</text>
        </g>
      ))}
      <line x1={L} x2={L + PW} y1={T + PH} y2={T + PH} stroke="#c9c7c0" />
      <text x={L + PW} y={T + PH + 48} textAnchor="end" fontSize="12" fill="#898781">성숙도 (기사 속 공개 → 투자 → 실증 → 도입 신호) →</text>
      <text transform={`translate(${L - 30} ${T + PH / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="#898781">관심·기대 ↑</text>
      <path d={path} fill="none" stroke="#232021" strokeWidth="2" opacity="0.8" />
      {placed.map(({ p, cx, cy, r, label }) => {
        const color = catColor(p.category);
        const sel = p.name === selected;
        const body = (
          <>
            <p className="font-bold text-[var(--rv-ink)]">{p.name}</p>
            <TipRow value={p.stage} label={p.confident ? "현재 단계" : "현재 단계 (신호 적음)"} />
            <TipRow value={`${p.count}건`} label={`기간 내 기사 · 최근 30일 ${p.recent}건`} />
            <TipRow value={pct(p.momentum)} label="최근 30일 속도 (이전 대비)" />
            <div className="mt-1 flex flex-wrap gap-x-2 text-[var(--rv-soft)]">
              {SIGNAL_ORDER.filter((k) => p.signals[k]).map((k) => <span key={k}><span style={{ color: SIGNAL_COLOR[k] }}>■</span> {signalLabel(k)} {p.signals[k]}</span>)}
            </div>
          </>
        );
        return (
          <g
            key={p.name}
            role="button"
            tabIndex={0}
            aria-label={`${p.name}: ${p.stage}, 기사 ${p.count}건`}
            className="cursor-pointer outline-none"
            onClick={() => onSelect(p.name)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(p.name)}
            onPointerMove={(e) => tip.show(e, body)}
            onPointerLeave={tip.hide}
            onFocus={(e) => tip.show(e, body)}
            onBlur={tip.hide}
          >
            <circle cx={cx} cy={cy} r={r + 10} fill="transparent" />
            {sel && <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke="#232021" strokeWidth="2" />}
            <circle cx={cx} cy={cy} r={r} fill={p.confident ? color : "#fff"} stroke={p.confident ? "#fff" : color} strokeWidth={p.confident ? 2 : 2.5} />
            {label.lead !== undefined && <line x1={cx} x2={cx} y1={label.lead} y2={cy - r - 2} stroke="#898781" strokeWidth="1" />}
            <text x={label.x} y={label.y} textAnchor={label.anchor} fontSize="12.5" fontWeight={sel ? 800 : 600} fill="#232021" paintOrder="stroke" stroke="#fff" strokeWidth="4">{p.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** 단계 신호 구성 막대 (선택한 기술) */
export function SignalBar({ p, tip }: { p: HypePoint; tip: TipApi }) {
  const items = SIGNAL_ORDER.filter((k) => p.signals[k] > 0);
  if (!p.signalTotal) return <p className="text-sm text-[var(--rv-mute)]">기사에서 단계 신호(공개·투자·실증·도입·회의)를 찾지 못했습니다. 언급만 있는 상태로 보고 &lsquo;기술 태동&rsquo;에 둡니다.</p>;
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

export function PeerHeat({ peers, tip }: { peers: InsightsData["peers"]; tip: TipApi }) {
  const max = Math.max(...peers.flatMap((p) => SIGNAL_ORDER.map((k) => p.signals[k])), 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-[2px] text-sm">
        <thead>
          <tr className="text-xs text-[var(--rv-soft)]">
            <th className="px-2 py-1 text-left font-bold">기업</th>
            {SIGNAL_ORDER.map((k) => <th key={k} className="w-[82px] px-1 py-1 font-bold">{signalLabel(k)}</th>)}
            <th className="w-[56px] px-1 py-1 font-bold">전체</th>
            <th className="px-2 py-1 text-left font-bold">가장 최근 기사</th>
          </tr>
        </thead>
        <tbody>
          {peers.map((p) => (
            <tr key={p.name}>
              <td className={`whitespace-nowrap rounded-[3px] px-2 py-1.5 ${p.self ? "border-l-4 border-[var(--rv-accent)] bg-[var(--rv-tint)] font-bold" : ""}`}>
                {p.name} {p.self && <span className="ml-1 rounded bg-[var(--rv-accent)] px-1 py-px text-[10px] font-bold text-white">자사</span>}
              </td>
              {SIGNAL_ORDER.map((k) => {
                const v = p.signals[k];
                const bg = rampColor(v, max);
                return (
                  <td
                    key={k}
                    tabIndex={0}
                    className="rounded-[3px] text-center text-xs font-bold tabular-nums"
                    style={{ background: bg, color: v && (RAMP as readonly string[]).indexOf(bg) >= 3 ? "#fff" : "#232021" }}
                    onPointerMove={(e) => tip.show(e, <TipRow value={`${v}건`} label={`${p.name} · ${signalLabel(k)}`} color={SIGNAL_COLOR[k]} />)}
                    onPointerLeave={tip.hide}
                    onFocus={(e) => tip.show(e, <TipRow value={`${v}건`} label={`${p.name} · ${signalLabel(k)}`} />)}
                    onBlur={tip.hide}
                  >
                    {v || ""}
                  </td>
                );
              })}
              <td className="text-center text-xs font-bold tabular-nums text-[var(--rv-soft)]">{p.total}</td>
              <td className="max-w-[340px] px-2 text-xs">
                {p.latest ? (
                  <a href={p.latest.link} target="_blank" rel="noreferrer" className="line-clamp-1 underline decoration-[var(--rv-line)] underline-offset-2 hover:decoration-[var(--rv-accent)]" title={p.latest.title}>
                    {p.latest.titleKo ?? p.latest.title} <span className="text-[var(--rv-mute)]">· {p.latest.publishedAt.slice(5, 10).replace("-", "/")}</span>
                  </a>
                ) : (
                  <span className="text-[var(--rv-mute)]">기간 내 기사 없음</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--rv-soft)]">
        <span>적음</span>
        {RAMP.map((c) => <span key={c} aria-hidden className="inline-block h-2.5 w-4 rounded-[2px]" style={{ background: c }} />)}
        <span>많음</span>
        <span className="ml-3">칸 = 그 기업이 언급된 기사 중 해당 신호가 있는 기사 수</span>
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
        <p className="mt-4 rounded border border-dashed border-[var(--rv-line)] p-3 text-center text-xs text-[var(--rv-mute)]">아직 받은 값이 없습니다. 매일 08:00 기사 수집 때 함께 받아 옵니다.</p>
      )}
    </div>
  );
}
