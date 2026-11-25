"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EXTERNAL_SOURCES, type ExternalSource } from "@/config/insights";
import { COUNTRIES, SEGMENTS, type Segment, type Vendor } from "@/config/vendors";
import { curveY, type InsightsData } from "@/lib/insights/compute";
import type { Indicator } from "@/lib/indicators";
import { catColor, useTip } from "@/components/report/parts";
import dynamic from "next/dynamic";
import { useInsights } from "./useInsights";
import { HypeMap, IndicatorCard, MIX_COLOR, MoverList, PeerBoard, SignalBar, SignalDonut, WeeklyBars, mixLabel, pct, signalLabel } from "./charts";
import type { StageKey } from "@/config/insights";
import { FOCUS, PortfolioMatrix, pp } from "./Portfolio";
// 세계 지도 데이터(약 100KB)는 공급사 지도 화면을 열 때만 불러온다
const WorldMap = dynamic(() => import("./WorldMap").then((m) => m.WorldMap), {
  ssr: false,
  loading: () => <div className="h-[320px] animate-pulse rounded-md bg-[#f1f0ec]" aria-label="지도 불러오는 중" />,
});

type V = Vendor & { fromSheet?: boolean };
interface Payload {
  insights: InsightsData;
  indicators: Indicator[];
  vendors: { vendors: V[]; sheetRows: number; warning?: string };
}

type ViewId = "now" | "portfolio" | "maturity" | "world" | "china" | "peers" | "flow" | "market" | "method" | "ext-gartner" | "ext-dhl" | "ext-mckinsey" | "ext-mhi" | "ext-kcci";
const VIEWS: { group: string; items: { id: ViewId; label: string }[] }[] = [
  { group: "기술 동향", items: [
    { id: "now", label: "최근 근황" },
    { id: "portfolio", label: "기술 포지션 맵" },
    { id: "maturity", label: "기술 성숙도 곡선" },
  ] },
  { group: "시장·경쟁", items: [
    { id: "world", label: "글로벌 공급사 지도" },
    { id: "china", label: "중국 물류기술 기업" },
    { id: "peers", label: "국내 동종업계 동향" },
  ] },
  { group: "흐름·지표", items: [
    { id: "flow", label: "키워드·주간 흐름" },
    { id: "market", label: "물동량·운임 지표" },
    { id: "method", label: "방법론·데이터 출처" },
  ] },
  { group: "외부 리포트", items: EXTERNAL_SOURCES.map((x) => ({ id: `ext-${x.id}` as ViewId, label: x.short })) },
];
const ALL_IDS = VIEWS.flatMap((g) => g.items.map((i) => i.id));
const day = (iso?: string) => (iso ? iso.slice(0, 10).replaceAll("-", ".") : "-");
const ko = (iso2: string) => COUNTRIES[iso2]?.ko ?? iso2;
type TipApi = ReturnType<typeof useTip>;

/** "3분 전" 처럼 지난 시간 (1분마다 갱신) */
function useAgo(at: number | null) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!at) return "";
  const m = Math.floor((Date.now() - at) / 60_000);
  return m < 1 ? "방금" : m < 60 ? `${m}분 전` : `${Math.floor(m / 60)}시간 전`;
}

/** 처음 불러오는 동안 화면 모양을 먼저 보여 준다 */
function Skeleton() {
  return (
    <div aria-busy="true" aria-label="불러오는 중" className="mx-auto max-w-[1180px] space-y-4">
      <div className="skeleton h-8 w-48 rounded" />
      <div className="skeleton h-4 w-2/3 rounded" />
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="skeleton h-[260px] rounded-lg" />
        <div className="skeleton h-[260px] rounded-lg" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-[200px] rounded-lg" />)}
      </div>
    </div>
  );
}

function Head({ title, lead, right }: { title: string; lead?: React.ReactNode; right?: React.ReactNode }) {
  // 제목 줄 오른쪽에 버튼을 두고, 설명은 아래 줄 전체 폭을 써서 한 줄로 읽히게
  return (
    <div className="mb-5 border-b border-[var(--rv-ink)] pb-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {right}
      </div>
      {lead && <p className="mt-1 text-sm text-[var(--rv-soft)] [text-wrap:pretty]">{lead}</p>}
    </div>
  );
}

function Card({ title, desc, children, right }: { title?: string; desc?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-[var(--rv-line)] bg-white p-4 sm:p-5">
      {(title || right) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h3 className="font-bold">{title}</h3>}
            {desc && <p className="text-xs text-[var(--rv-soft)]">{desc}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="inline-flex rounded border border-[var(--rv-line)] bg-white p-0.5 text-xs" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={`rounded px-2.5 py-1 ${value === v ? "bg-[var(--rv-ink)] font-bold text-white" : "text-[var(--rv-soft)]"}`}>{l}</button>
      ))}
    </div>
  );
}

const Conf = ({ c }: { c: Vendor["confidence"] }) => (
  <span className={`whitespace-nowrap rounded px-1.5 py-px text-[10px] font-bold ${c === "확인" ? "bg-[#e8f1fb] text-[#104281]" : c === "일부 확인" ? "bg-[#f1f0ec] text-[#5c5755]" : "border border-dashed border-[#c9c7c0] text-[#898781]"}`}>{c}</span>
);

export function InsightsPage() {
  const tip = useTip();
  const [view, setView] = useState<ViewId>("now");
  const [days, setDays] = useState(180);
  const [q, setQ] = useState("");
  const { data, error, refreshing, updatedAt, reload } = useInsights(days);
  const ago = useAgo(updatedAt);

  // 주소의 #보기 와 맞춤 (링크 공유·뒤로 가기)
  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.slice(1) as ViewId;
      if (ALL_IDS.includes(h)) setView(h);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const go = (id: ViewId) => {
    setView(id);
    history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0 });
  };

  const query = q.trim().toLowerCase();
  const current = VIEWS.flatMap((g) => g.items).find((i) => i.id === view)!;
  const thin = data && data.insights.coverage.inWindow < 60 && !["world", "china", "method"].includes(view);

  return (
    <div className="rv -mx-4 -my-5 grid min-h-[calc(100vh-var(--header-total,60px))] break-keep text-[15px] leading-7 lg:grid-cols-[248px_1fr]">
      {tip.view}
      {refreshing && data && <div aria-hidden className="load-bar fixed inset-x-0 z-40 h-[2px]" style={{ top: "var(--header-total, 60px)" }} />}

      {/* 사이드바: 보기 · 기간 · 검색 */}
      <aside className="border-b border-[var(--rv-line)] bg-[#fbfaf8] lg:sticky lg:top-[var(--header-total,60px)] lg:h-[calc(100vh-var(--header-total,60px))] lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="space-y-5 p-4">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-[var(--rv-accent)]">LOGISTICS TECH INTELLIGENCE</p>
            <p className="text-lg font-bold leading-tight">물류기술 인텔리전스</p>
            <p className="text-[11px] text-[var(--rv-mute)]">{data ? `수집 기사 ${data.insights.coverage.total.toLocaleString()}건 · ${day(data.insights.coverage.last)} 기준` : "불러오는 중"}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--rv-mute)]">
              <span aria-live="polite">{refreshing ? "최신 데이터 확인 중…" : ago ? `${ago} 갱신` : ""}</span>
              <button type="button" onClick={reload} disabled={refreshing} className="rounded px-1 text-[var(--rv-soft)] underline decoration-[var(--rv-line)] hover:text-[var(--rv-ink)] disabled:opacity-40" title="시트에서 다시 읽기 (공급사·지표 입력 직후)">↻ 새로고침</button>
            </p>
          </div>

          <label className="block lg:hidden">
            <span className="sr-only">보기 선택</span>
            <select value={view} onChange={(e) => go(e.target.value as ViewId)} className="w-full rounded border border-[var(--rv-line)] bg-white px-2 py-2 text-sm font-bold">
              {VIEWS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
                </optgroup>
              ))}
            </select>
          </label>

          <nav aria-label="인사이트 보기" className="hidden space-y-4 lg:block">
            {VIEWS.map((g) => (
              <div key={g.group}>
                <p className="mb-1 px-2 text-[11px] font-bold text-[var(--rv-mute)]">{g.group}</p>
                <ul>
                  {g.items.map((i) => (
                    <li key={i.id}>
                      <button
                        type="button"
                        aria-current={view === i.id ? "page" : undefined}
                        onClick={() => go(i.id)}
                        className={`relative w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${view === i.id ? "bg-[var(--rv-tint)] font-bold text-[var(--rv-accent)] before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-[var(--rv-accent)]" : "text-[var(--rv-ink)] hover:bg-[#f1f0ec]"}`}
                      >
                        {i.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="space-y-3 border-t border-[var(--rv-line)] pt-4">
            <div>
              <p className="mb-1 text-[11px] font-bold text-[var(--rv-mute)]">분석 기간</p>
              <Toggle label="분석 기간" value={String(days)} onChange={(v) => setDays(Number(v))} options={[["90", "90일"], ["180", "180일"], ["365", "1년"]]} />
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-[var(--rv-mute)]">기업·기술 찾기</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="예: Geek+, AMR, 셔틀" className="w-full rounded border border-[var(--rv-line)] bg-white px-2 py-1.5 text-sm" />
            </label>
            {query && <p className="text-[11px] text-[var(--rv-soft)]">최근 근황 · 공급사 지도 · 중국 기업 목록이 검색어로 좁혀집니다.</p>}
          </div>
        </div>
      </aside>

      <div className="min-w-0 px-4 py-6 lg:px-8">
        {error && <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {!data && !error && <Skeleton />}
        {data && (
          <div key={view} className="view-enter mx-auto max-w-[1180px]">
            {thin && (
              <p className="mb-4 rounded border border-[#f1d8d4] bg-[var(--rv-tint)] px-3 py-2 text-xs text-[var(--rv-soft)]">
                <b className="text-[var(--rv-accent)]">데이터 쌓는 중</b> · 분석 기간 내 기사 {data.insights.coverage.inWindow}건. 위치와 증감은 수집이 이어질수록 안정됩니다.
              </p>
            )}
            {view === "now" && <NowView d={data.insights} query={query} tip={tip} />}
            {view === "portfolio" && <PortfolioView d={data.insights} tip={tip} />}
            {view === "maturity" && <MaturityView d={data.insights} tip={tip} />}
            {view === "world" && <WorldView vendors={data.vendors.vendors} query={query} tip={tip} warning={data.vendors.warning} />}
            {view === "china" && <ChinaView vendors={data.vendors.vendors} query={query} />}
            {view === "peers" && <PeersView d={data.insights} tip={tip} />}
            {view === "flow" && <FlowView d={data.insights} tip={tip} />}
            {view === "market" && <MarketView indicators={data.indicators} tip={tip} />}
            {view === "method" && <MethodView d={data.insights} vendors={data.vendors} />}
            {view.startsWith("ext-") && <ExternalView id={view.slice(4) as ExternalSource["id"]} d={data.insights} />}
            <p className="mt-8 text-[11px] text-[var(--rv-mute)]">{current.label} · 분석 기간 최근 {days}일 · 숫자는 수집 기사를 코드가 센 결과입니다(모델이 만든 수치 없음).</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 최근 근황 ───────────────────────────── */

function NowView({ d, query, tip }: { d: InsightsData; query: string; tip: TipApi }) {
  const [pick, setPick] = useState<StageKey | "none">();
  const match = (t: { title: string; titleKo?: string; techs: string[]; source: string }) => !query || `${t.title} ${t.titleKo ?? ""} ${t.techs.join(" ")} ${t.source}`.toLowerCase().includes(query);
  const total = d.now.mix.reduce((n, m) => n + m.count, 0);
  const choose = (k?: StageKey | "none") => {
    setPick(k);
    if (k && k !== "none") setTimeout(() => document.getElementById(`feed-${k}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
  };
  return (
    <>
      <Head title="최근 근황" lead="분석 기간 기사를 대표 신호(도입·실증·투자·공개·리스크)로 나눴습니다. 원그래프 조각을 누르면 해당 기사 묶음을 표시합니다." />
      <section className="grid items-center gap-6 rounded-lg border border-[var(--rv-line)] bg-white p-5 md:grid-cols-[260px_1fr]">
        <div className="mx-auto w-full max-w-[260px]">
          <SignalDonut mix={d.now.mix} selected={pick} onPick={choose} tip={tip} />
        </div>
        <div className="min-w-0">
          <ul className="grid gap-1 sm:grid-cols-2">
            {d.now.mix.filter((m) => m.count > 0).map((m) => {
              const on = pick === m.key;
              return (
                <li key={m.key}>
                  <button type="button" aria-pressed={on} onClick={() => choose(on ? undefined : m.key)} className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${on ? "bg-[var(--rv-ink)] text-white" : "hover:bg-[var(--wash)]"}`}>
                    <span aria-hidden className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: MIX_COLOR[m.key] }} />
                    <span className="flex-1">{mixLabel(m.key)}</span>
                    <b className="tabular-nums">{m.count}</b>
                    <span className={`w-10 text-right text-xs tabular-nums ${on ? "text-white/70" : "text-[var(--rv-mute)]"}`}>{Math.round((m.count / Math.max(total, 1)) * 100)}%</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {d.now.highlights.length > 0 && (
            <div className="mt-4 border-t border-[var(--rv-line)] pt-3">
              <p className="text-xs font-bold text-[var(--rv-accent)]">핵심 변화 (최근 30일 vs 직전 30일, 자동 집계)</p>
              <ul className="mt-1 space-y-1 text-sm">{d.now.highlights.map((h) => <li key={h} className="flex gap-2"><span aria-hidden className="text-[var(--rv-mute)]">▪</span>{h}</li>)}</ul>
            </div>
          )}
        </div>
      </section>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {d.now.feed.filter((g) => g.signal !== "doubt" || g.count).map((g) => {
          const items = g.items.filter(match);
          const on = pick === g.signal;
          return (
            <section
              key={g.signal}
              id={`feed-${g.signal}`}
              className={`relative min-w-0 scroll-mt-24 rounded-lg bg-white p-4 transition-[box-shadow,border-color,opacity] duration-300 ${on ? "border-2 border-[var(--rv-ink)] shadow-[0_14px_30px_-18px_rgb(28_26_25/0.55)]" : `border border-[var(--rv-line)] ${pick ? "opacity-55" : ""}`}`}
            >
              {on && <span className="view-enter absolute -top-3 left-4 rounded-full bg-[var(--rv-ink)] px-2.5 py-0.5 text-[11px] font-bold text-white">원그래프에서 선택한 부분</span>}
              <button type="button" onClick={() => choose(on ? undefined : g.signal)} className="mb-2 flex w-full items-center gap-2 text-left">
                <span aria-hidden className="h-3 w-3 rounded-[3px]" style={{ background: MIX_COLOR[g.signal] }} />
                <h3 className="font-bold">{signalLabel(g.signal)}</h3>
                <span className="ml-auto text-xs tabular-nums text-[var(--rv-mute)]">{g.count}건{g.count > g.items.length ? ` 중 최신 ${g.items.length}` : ""}</span>
              </button>
              {g.signal === "doubt" && <p className="-mt-1 mb-1 text-xs text-[var(--rv-soft)]">중단·지연·철수 등 리스크 신호</p>}
              {items.length === 0 ? (
                <p className="text-sm text-[var(--rv-mute)]">해당 기사 없음</p>
              ) : (
                <ul className="divide-y divide-[var(--rv-line)]">
                  {items.map((a) => (
                    <li key={a.id} className="flex gap-3 py-2 text-sm leading-snug">
                      {a.thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element -- 언론사 원본 썸네일 (외부 주소)
                        <img src={a.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-12 w-[72px] shrink-0 rounded object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                      )}
                      <div className="min-w-0">
                        <a href={a.link} target="_blank" rel="noreferrer" className="font-medium underline decoration-[var(--rv-line)] underline-offset-2 hover:decoration-[var(--rv-accent)]">{a.titleKo ?? a.title}</a>
                        <p className="mt-0.5 text-[11px] text-[var(--rv-mute)]">
                          {a.source} · {day(a.publishedAt)}
                          {a.techs.length > 0 && <span className="ml-1 font-bold text-[var(--rv-accent)]">· {a.techs.join(" · ")}</span>}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

/* ── 기술 포지션 맵 ───────────────────────────── */

function PortfolioView({ d, tip }: { d: InsightsData; tip: TipApi }) {
  const [onlyFocus, setOnlyFocus] = useState(false);
  const [table, setTable] = useState(false);
  const pf = d.portfolio;
  const plotted = pf.points.filter((p) => p.recent.maturity !== null);
  const noSignal = pf.points.filter((p) => p.recent.maturity === null);
  const quadrant = (p: (typeof pf.points)[number]) =>
    p.recent.maturity === null ? "-" : p.recent.share >= pf.median.share ? (p.recent.maturity >= pf.median.maturity ? "주류 · 도입 검토" : "기대 선행 · 실증 검증") : p.recent.maturity >= pf.median.maturity ? "안정 · 운영 최적화" : "관찰";
  const actNow = plotted.filter((p) => p.relevance === 3 && quadrant(p) === "주류 · 도입 검토").map((p) => p.name);
  const pilot = plotted.filter((p) => p.relevance >= 2 && quadrant(p) === "기대 선행 · 실증 검증").map((p) => p.name);
  const td = "border border-[var(--rv-line)] px-2 py-1.5";
  return (
    <>
      <Head
        title="기술 포지션 맵"
        lead={<>시장 기사 기준 <b>성숙도</b>(도입·실증 근거) × <b>관심도</b>(언급 점유율). 회색 작은 원({day(pf.pastFrom)}~) → 큰 원({day(pf.recentFrom)}~)이 이동, <b style={{ color: FOCUS }}>빨간 원</b>은 CL사업 연관 높음.</>}
        right={
          <div className="flex flex-wrap gap-2">
            <Toggle label="표시 범위" value={onlyFocus ? "focus" : "all"} onChange={(v) => setOnlyFocus(v === "focus")} options={[["all", "전체 기술"], ["focus", "CL 연관 높음만"]]} />
            <Toggle label="보기 방식" value={table ? "table" : "chart"} onChange={(v) => setTable(v === "table")} options={[["chart", "차트"], ["table", "표"]]} />
          </div>
        }
      />
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--rv-line)] bg-white p-4">
          <p className="text-xs font-bold text-[var(--rv-soft)]">지금 도입을 검토할 기술 <span className="font-normal">(CL 연관 높음 · 주류 사분면)</span></p>
          <p className="mt-1 text-lg font-bold">{actNow.length ? actNow.join(", ") : "해당 없음"}</p>
        </div>
        <div className="rounded-lg border border-[var(--rv-line)] bg-white p-4">
          <p className="text-xs font-bold text-[var(--rv-soft)]">실증(PoC)으로 먼저 확인할 기술 <span className="font-normal">(연관 중간 이상 · 기대 선행 사분면)</span></p>
          <p className="mt-1 text-lg font-bold">{pilot.length ? pilot.join(", ") : "해당 없음"}</p>
        </div>
      </div>
      <Card>
        {table ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#f4f3ef] text-left text-xs text-[var(--rv-soft)]">
                  {["기술", "CL 연관", "사분면", "성숙도 (지난→최근)", "관심도 (지난→최근)", "기사 (지난→최근)", "리스크 신호"].map((h) => <th key={h} className={td}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...pf.points].sort((a, b) => b.recent.count - a.recent.count).filter((p) => !onlyFocus || p.relevance === 3).map((p) => (
                  <tr key={p.name}>
                    <td className={`${td} font-medium`}>{p.name}</td>
                    <td className={td}>{["", "낮음", "중간", "높음"][p.relevance]}</td>
                    <td className={td}>{quadrant(p)}</td>
                    <td className={`${td} tabular-nums`}>{p.past.maturity === null ? "-" : pp(p.past.maturity)} → {p.recent.maturity === null ? "-" : pp(p.recent.maturity)}</td>
                    <td className={`${td} tabular-nums`}>{pp(p.past.share)} → {pp(p.recent.share)}</td>
                    <td className={`${td} tabular-nums`}>{p.past.count} → {p.recent.count}</td>
                    <td className={`${td} tabular-nums`}>{p.doubtShare ? pp(p.doubtShare) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : plotted.length ? (
          <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            <div className="min-w-[760px]">
              <PortfolioMatrix data={pf} onlyFocus={onlyFocus} tip={tip} />
            </div>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-[var(--rv-mute)]">최근 기간에 단계 신호가 있는 기술 기사가 없습니다.</p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--rv-soft)]">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: FOCUS }} />CL사업 연관 높음</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-[#a9a7a0]" />연관 중간·낮음</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px] border-[#898781] bg-white" />지난 기간 위치</span>
          <span>원 크기 = 최근 기간 기사 수 · ! = 중단·지연 등 리스크 신호 20% 이상</span>
        </div>
        {noSignal.length > 0 && <p className="mt-2 text-xs text-[var(--rv-mute)]">언급은 있으나 단계 신호가 없어 표시하지 않은 기술: {noSignal.map((p) => `${p.name}(${p.recent.count}건)`).join(", ")}</p>}
      </Card>
      <p className="mt-3 text-xs leading-relaxed text-[var(--rv-soft)]">
        <b>읽는 법:</b> 우리 회사가 가진 기술이 아니라 시장의 흐름입니다. 빨간 원(CL사업 연관 높음)이 오른쪽 위에 있으면 지금 도입을 검토할 때, 왼쪽 위에 있으면 실증으로 먼저 확인할 때입니다. <b>왜 이 차트인가:</b> 트리맵은 &lsquo;얼마나 많이 다뤄졌나&rsquo;만, 하이프 사이클은 &lsquo;어느 단계인가&rsquo;만 보여 줍니다. 전략 판단에는 성숙도와 관심도를 함께 보고, 지난 기간에서 어디로 움직였는지가 필요해 두 축 버블과 이동 화살표를 택했습니다. 두 축 모두 기사에서 계산하는 값이라 근거 기사로 검증할 수 있습니다(계산식은 방법론 메뉴).
      </p>
    </>
  );
}

/* ── 기술 성숙도 곡선 (보조) ───────────────────────────── */

function MaturityView({ d, tip }: { d: InsightsData; tip: TipApi }) {
  const [selected, setSelected] = useState<string | undefined>(() => [...d.hype].sort((a, b) => b.count - a.count)[0]?.name);
  const sel = d.hype.find((h) => h.name === selected);
  return (
    <>
      <Head title="기술 성숙도 곡선" lead="기사 신호를 하이프 사이클 형식으로 본 화면입니다(우리 수집 기사 기준, Gartner 평가 아님). 점을 누르면 근거 기사를 봅니다." />
      <Card>
        {d.hype.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--rv-mute)]">기간 내 추적 기술이 언급된 기사가 없습니다.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            <div className="min-w-[760px]"><HypeMap points={d.hype} curve={curveY} selected={selected} onSelect={setSelected} tip={tip} /></div>
          </div>
        )}
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--rv-soft)]">
          {[...new Set(d.hype.map((h) => h.category))].map((c) => <span key={c} className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: catColor(c) }} />{c}</span>)}
          <span>속이 빈 점 = 신호 3건 미만 · 점 크기 = 기사 수</span>
        </div>
        {sel && (
          <div className="mt-4 grid gap-5 rounded-md bg-[#f6f5f2] p-4 md:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="text-xl font-bold">{sel.name}</p>
              <p className="text-sm text-[var(--rv-soft)]"><b className="text-[var(--rv-ink)]">{sel.stage}</b> · 기사 {sel.count}건 · 최근 30일 {sel.recent}건 ({pct(sel.momentum)})</p>
              <p className="mb-2 mt-3 text-xs font-bold text-[var(--rv-soft)]">단계 신호 구성</p>
              <SignalBar p={sel} tip={tip} />
            </div>
            <ul className="space-y-1.5 text-sm">
              {sel.articles.map((a) => (
                <li key={a.id} className="leading-snug">
                  <a href={a.link} target="_blank" rel="noreferrer" className="underline decoration-[var(--rv-line)] underline-offset-2">{a.titleKo ?? a.title}</a>
                  <span className="ml-1 text-xs text-[var(--rv-mute)]">{a.source} · {day(a.publishedAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </>
  );
}

/* ── 공급사 표 ───────────────────────────── */

const vendorText = (v: V) => `${v.name} ${v.nameLocal ?? ""} ${v.solutions.join(" ")} ${v.segments.map((s) => SEGMENTS[s]).join(" ")} ${ko(v.country)} ${v.korea ?? ""}`.toLowerCase();
const segShort = (s: Segment) => SEGMENTS[s].split(" (")[0];

function VendorTable({ vendors, rankFirst }: { vendors: V[]; rankFirst?: boolean }) {
  if (!vendors.length) return <p className="rounded border border-dashed border-[var(--rv-line)] p-6 text-center text-sm text-[var(--rv-mute)]">조건에 맞는 회사가 없습니다.</p>;
  const cell = "border-b border-[var(--rv-line)] px-3 py-2.5";
  const heads = rankFirst ? ["순위·근거", "회사", "분야", "대표 솔루션", "공급 범위·한국 사업", "출처"] : ["회사", "본사", "분야", "대표 솔루션", "순위·근거", "한국 사업", "출처"];
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--rv-line)] bg-white">
      <table className="w-full min-w-[960px] border-collapse text-sm">
        <thead>
          <tr className="bg-[#f4f3ef] text-left text-xs text-[var(--rv-soft)]">{heads.map((h) => <th key={h} className="border-b border-[var(--rv-line)] px-3 py-2">{h}</th>)}</tr>
        </thead>
        <tbody>
          {vendors.map((v) => {
            const rank = v.rank ? <><b>{v.rank.value}</b><span className="block text-[11px] text-[var(--rv-mute)]">{v.rank.basis}</span></> : <span className="text-[11px] text-[var(--rv-mute)]">공개 순위 없음</span>;
            const company = (
              <>
                <b>{v.name}</b> <Conf c={v.confidence} />
                {v.nameLocal && <span className="block text-xs text-[var(--rv-soft)]">{v.nameLocal}</span>}
                {v.parent && <span className="block text-[11px] text-[var(--rv-mute)]">모회사 {v.parent}</span>}
                {v.fromSheet && <span className="block text-[11px] text-[var(--rv-accent)]">시트 입력 반영</span>}
              </>
            );
            const segs = <span className="text-xs">{v.segments.map(segShort).join(" · ")}</span>;
            const sols = <span className="text-xs">{v.solutions.join(" · ")}</span>;
            const srcs = (
              <span className="flex flex-col gap-0.5 text-[11px]">
                {v.sources.length ? v.sources.slice(0, 3).map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="underline decoration-[var(--rv-line)]">{s.label}</a>) : <span className="text-[var(--rv-mute)]">출처 입력 필요</span>}
              </span>
            );
            const korea = v.korea ? <span className="text-xs">{v.korea}</span> : <span className="text-xs text-[var(--rv-mute)]">확인 필요</span>;
            return (
              <tr key={v.name} className="align-top hover:bg-[#fbfaf8]">
                {rankFirst ? (
                  <>
                    <td className={`${cell} w-[210px]`}>{rank}</td>
                    <td className={`${cell} w-[170px]`}>{company}</td>
                    <td className={cell}>{segs}</td>
                    <td className={cell}>{sols}</td>
                    <td className={`${cell} w-[300px] text-xs`}>
                      {v.reach && <span className="block">{v.reach}</span>}
                      {v.markets?.length ? <span className="block text-[var(--rv-soft)]">공급 확인: {v.markets.map(ko).join(", ")}</span> : null}
                      <span className="mt-1 block"><b>한국</b> {korea}</span>
                    </td>
                    <td className={`${cell} w-[150px]`}>{srcs}</td>
                  </>
                ) : (
                  <>
                    <td className={`${cell} w-[170px]`}>{company}</td>
                    <td className={`${cell} whitespace-nowrap text-xs`}>{ko(v.country)}{v.city ? <span className="block text-[var(--rv-mute)]">{v.city}</span> : null}</td>
                    <td className={cell}>{segs}</td>
                    <td className={cell}>{sols}</td>
                    <td className={`${cell} w-[180px]`}>{rank}</td>
                    <td className={`${cell} w-[240px]`}>{korea}</td>
                    <td className={`${cell} w-[150px]`}>{srcs}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── 글로벌 공급사 지도 ───────────────────────────── */

function WorldView({ vendors, query, tip, warning }: { vendors: V[]; query: string; tip: TipApi; warning?: string }) {
  const [mode, setMode] = useState<"hq" | "market" | "ref">("hq");
  const [tab, setTab] = useState<"overview" | "revenue" | "refs">("overview");
  const [seg, setSeg] = useState<Segment | "all">("all");
  const [sel, setSel] = useState<string>();
  const [hover, setHover] = useState<string>();
  const [find, setFind] = useState("");
  const list = useMemo(() => vendors.filter((v) => (seg === "all" || v.segments.includes(seg)) && (!query || vendorText(v).includes(query))), [vendors, seg, query]);
  const keysOf = useCallback((v: V) => (mode === "hq" ? [v.country] : mode === "market" ? v.markets ?? [] : (v.references ?? []).map((r) => r.country ?? "")), [mode]);
  const { counts, names, nav } = useMemo(() => {
    const counts = new Map<string, number>();
    const names = new Map<string, string[]>();
    for (const v of list) {
      for (const k of new Set(keysOf(v))) {
        const id = COUNTRIES[k]?.id;
        if (!id) continue;
        counts.set(id, (counts.get(id) ?? 0) + 1);
        names.set(id, [...(names.get(id) ?? []), v.name]);
      }
    }
    // 왼쪽 나라 목록: 회사가 있는 나라만, 많은 순
    const nav = Object.entries(COUNTRIES)
      .map(([iso2, c]) => ({ iso2, id: c.id, ko: c.ko, n: counts.get(c.id) ?? 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n || a.ko.localeCompare(b.ko, "ko"));
    return { counts, names, nav };
  }, [list, keysOf]);
  const iso2Sel = sel ? Object.entries(COUNTRIES).find(([, c]) => c.id === sel)?.[0] : undefined;
  const shown = iso2Sel ? list.filter((v) => keysOf(v).includes(iso2Sel)) : list;
  const navShown = nav.filter((c) => !find.trim() || `${c.ko} ${c.iso2}`.toLowerCase().includes(find.trim().toLowerCase()));
  const maxN = Math.max(...nav.map((c) => c.n), 1);
  const modeWord = mode === "hq" ? "본사" : mode === "market" ? "공급 확인" : "적용 사례";
  return (
    <>
      <Head
        title="글로벌 공급사 지도"
        lead="나라 목록에서 고르면 지도와 기업 목록이 그 나라로 맞춰집니다. 공급·적용 국가는 출처로 확인된 것만 표시하며, 팀이 시트 Vendors 탭에서 보강합니다."
        right={<Toggle label="지도 기준" value={mode} onChange={(v) => { setMode(v); setSel(undefined); if (v === "ref") setTab("refs"); }} options={[["hq", "본사 국가"], ["market", "공급 국가"], ["ref", "적용 사례 국가"]]} />}
      />
      {warning && <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{warning}</p>}
      <div className="mb-3 flex flex-wrap gap-1.5 text-xs" role="group" aria-label="분야">
        {(["all", ...Object.keys(SEGMENTS)] as (Segment | "all")[]).map((s) => (
          <button key={s} type="button" aria-pressed={seg === s} onClick={() => setSeg(s)} className={`rounded-full border px-2.5 py-1 ${seg === s ? "border-[var(--rv-ink)] bg-[var(--rv-ink)] text-white" : "border-[var(--rv-line)] bg-white text-[var(--rv-soft)]"}`}>
            {s === "all" ? "전체 분야" : segShort(s)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* 나라 목록 (지도를 몰라도 이름으로 찾기) */}
        <nav aria-label="나라 목록" className="min-w-0 rounded-lg border border-[var(--rv-line)] bg-white p-3 lg:sticky lg:top-[calc(var(--header-total,60px)+16px)] lg:max-h-[calc(100vh-var(--header-total,60px)-32px)] lg:self-start lg:overflow-y-auto">
          <p className="mb-2 px-1 text-[11px] font-bold text-[var(--rv-mute)]">{modeWord} 기준 · {nav.length}개국</p>
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="나라 찾기" aria-label="나라 찾기" className="mb-2 w-full rounded border border-[var(--rv-line)] px-2 py-1.5 text-sm" />
          <ul className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5 lg:overflow-visible">
            <li className="shrink-0">
              <button type="button" onClick={() => setSel(undefined)} className={`flex w-full items-center gap-2 whitespace-nowrap rounded-md px-2 py-1.5 text-left text-sm ${!sel ? "bg-[var(--rv-tint)] font-bold text-[var(--rv-accent)]" : "hover:bg-[#f6f5f2]"}`}>
                전체 국가 <span className="ml-auto text-xs tabular-nums text-[var(--rv-mute)]">{list.length}곳</span>
              </button>
            </li>
            {navShown.map((c) => {
              const on = c.id === sel;
              return (
                <li key={c.iso2} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSel(on ? undefined : c.id)}
                    onPointerEnter={() => setHover(c.id)}
                    onPointerLeave={() => setHover(undefined)}
                    onFocus={() => setHover(c.id)}
                    onBlur={() => setHover(undefined)}
                    className={`grid w-full grid-cols-[28px_1fr_auto] items-center gap-2 whitespace-nowrap rounded-md px-2 py-1.5 text-left text-sm transition-colors ${on ? "bg-[var(--rv-tint)] font-bold text-[var(--rv-accent)]" : "hover:bg-[#f6f5f2]"}`}
                  >
                    <span className="font-display text-[10px] font-bold tracking-wider text-[var(--rv-mute)]">{c.iso2}</span>
                    <span className="min-w-0">
                      {c.ko}
                      <span aria-hidden className="mt-0.5 hidden h-1 rounded-full bg-[#e8f1fb] lg:block"><span className="block h-1 rounded-full bg-[#3987E5]" style={{ width: `${(c.n / maxN) * 100}%` }} /></span>
                    </span>
                    <span className="text-xs tabular-nums text-[var(--rv-soft)]">{c.n}</span>
                  </button>
                </li>
              );
            })}
            {navShown.length === 0 && <li className="px-2 py-3 text-xs text-[var(--rv-mute)]">해당하는 나라가 없습니다.</li>}
          </ul>
        </nav>

        <div className="min-w-0 space-y-4">
          <Card>
            <div className="mx-auto max-w-[820px]">
              <WorldMap counts={counts} names={names} label={`${modeWord} 기준 회사 수`} selected={sel} hovered={hover} onSelect={setSel} tip={tip} />
            </div>
          </Card>
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-bold">
                {iso2Sel ? <>{ko(iso2Sel)} <span className="font-normal text-[var(--rv-soft)]">{modeWord} 기업 {shown.length}곳</span></> : <>전체 <span className="font-normal text-[var(--rv-soft)]">{shown.length}곳</span></>}
              </p>
              <Toggle label="표 종류" value={tab} onChange={setTab} options={[["overview", "기업 개요"], ["revenue", `매출 (${shown.filter((v) => v.revenue).length})`], ["refs", `적용 사례 (${shown.reduce((n, v) => n + (v.references?.length ?? 0), 0)})`]]} />
            </div>
            <div key={`${tab}-${sel ?? "all"}`} className="view-enter">
              {tab === "overview" && <VendorTable vendors={shown} />}
              {tab === "revenue" && <RevenueTable vendors={shown} />}
              {tab === "refs" && <ReferenceList vendors={shown} country={mode === "ref" ? iso2Sel : undefined} />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** 매출: 보고된 통화·연도 그대로 (환율 환산하지 않음) */
function RevenueTable({ vendors }: { vendors: V[] }) {
  const has = vendors.filter((v) => v.revenue);
  const none = vendors.filter((v) => !v.revenue);
  const cell = "border-b border-[var(--rv-line)] px-3 py-2.5";
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-[var(--rv-line)] bg-white">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-[#f4f3ef] text-left text-xs text-[var(--rv-soft)]">{["회사", "본사", "매출", "연도", "근거", "공개 순위"].map((h) => <th key={h} className="border-b border-[var(--rv-line)] px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {has.map((v) => (
              <tr key={v.name} className="hover:bg-[#fbfaf8]">
                <td className={`${cell} font-bold`}>{v.name}<span className="block text-[11px] font-normal text-[var(--rv-mute)]">{v.segments.map(segShort).join(" · ")}</span></td>
                <td className={`${cell} text-xs`}>{ko(v.country)}</td>
                <td className={`${cell} font-display text-base font-bold tabular-nums`}>{v.revenue!.value}</td>
                <td className={`${cell} tabular-nums`}>{v.revenue!.year}</td>
                <td className={`${cell} text-xs`}>{v.revenue!.url ? <a href={v.revenue!.url} target="_blank" rel="noreferrer" className="underline decoration-[var(--rv-line)]">{v.revenue!.basis}</a> : v.revenue!.basis}</td>
                <td className={`${cell} text-xs`}>{v.rank?.value ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--rv-mute)]">통화와 연도가 회사마다 달라 그대로 적었습니다(환율 환산 없음). 매출 미확인 {none.length}곳은 시트 Vendors 탭의 &lsquo;매출&rsquo; 칸에 넣으면 이 표에 나옵니다.</p>
    </div>
  );
}

/** 적용 사례: 고객사 · 국가 · 내용 · 출처 */
function ReferenceList({ vendors, country }: { vendors: V[]; country?: string }) {
  const rows = vendors.flatMap((v) => (v.references ?? []).filter((r) => !country || r.country === country).map((r) => ({ v, r })));
  if (!rows.length) return <p className="rounded border border-dashed border-[var(--rv-line)] p-6 text-center text-sm text-[var(--rv-mute)]">확인된 적용 사례가 없습니다. 시트 Vendors 탭의 &lsquo;레퍼런스&rsquo; 칸에 고객|국가|내용|연도|URL 형식으로 넣어 주세요.</p>;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {rows.map(({ v, r }, i) => (
        <li key={`${v.name}-${i}`} className="lift rounded-lg border border-[var(--rv-line)] bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-[var(--rv-soft)]">{v.name} · {v.segments.map(segShort).join(" · ")}</p>
              <p className="font-bold leading-snug">{r.customer}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--wash)] px-2 py-0.5 text-[11px] font-bold">{r.country ? ko(r.country) : "국가 미상"}{r.year ? ` · ${r.year}` : ""}</span>
          </div>
          <p className="mt-1 text-sm text-[var(--rv-soft)]">{r.detail}</p>
          {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] underline decoration-[var(--rv-line)]">출처 ↗</a>}
        </li>
      ))}
    </ul>
  );
}

/* ── 중국 물류기술 기업 ───────────────────────────── */

function ChinaView({ vendors, query }: { vendors: V[]; query: string }) {
  const [seg, setSeg] = useState<Segment | "all">("all");
  const cn = vendors.filter((v) => v.country === "CN" || /midea|중국/i.test(v.parent ?? ""));
  const segs = (Object.keys(SEGMENTS) as Segment[]).map((s) => ({ s, list: cn.filter((v) => v.segments.includes(s)) })).filter((x) => x.list.length).sort((a, b) => b.list.length - a.list.length);
  const maxN = Math.max(...segs.map((x) => x.list.length), 1);
  const list = cn.filter((v) => (seg === "all" || v.segments.includes(seg)) && (!query || vendorText(v).includes(query)));
  const inKorea = cn.filter((v) => v.korea);
  return (
    <>
      <Head title="중국 물류기술 기업" lead="Full-Stack SI·AMR·셔틀·디지털 트윈 등 분야별 중국 기업과 솔루션입니다. 공개 순위표가 없어 순위는 상장 서류·회사 발표 등 근거가 있을 때만 적었습니다." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--rv-line)] bg-white p-4"><p className="text-xs font-bold text-[var(--rv-soft)]">정리된 중국 기업</p><p className="text-[28px] font-bold tabular-nums">{cn.length}</p><p className="text-[11px] text-[var(--rv-mute)]">중국 자본이 소유한 해외 기업 포함 (예: Swisslog)</p></div>
        <div className="rounded-lg border border-[var(--rv-line)] bg-white p-4"><p className="text-xs font-bold text-[var(--rv-soft)]">한국 사업 확인</p><p className="text-[28px] font-bold tabular-nums">{inKorea.length}</p><p className="text-[11px] text-[var(--rv-mute)]">{inKorea.map((v) => v.name).join(", ") || "-"}</p></div>
        <div className="rounded-lg border border-[var(--rv-line)] bg-white p-4"><p className="text-xs font-bold text-[var(--rv-soft)]">출처 확인 상태</p><p className="mt-1 text-sm"><b>{cn.filter((v) => v.confidence === "확인").length}</b> 확인 · <b>{cn.filter((v) => v.confidence === "일부 확인").length}</b> 일부 확인 · <b>{cn.filter((v) => v.confidence === "입력 필요").length}</b> 입력 필요</p></div>
      </div>
      <Card title="분야별 기업 분포" desc="한 회사가 여러 분야에 들어갈 수 있습니다. 줄을 누르면 아래 목록이 그 분야로 좁혀집니다.">
        <ul className="space-y-2">
          {segs.map(({ s, list: l }) => (
            <li key={s}>
              <button type="button" onClick={() => setSeg(seg === s ? "all" : s)} aria-pressed={seg === s} className={`grid w-full grid-cols-[minmax(110px,200px)_1fr_28px] items-center gap-3 rounded px-1 py-0.5 text-left text-sm ${seg === s ? "bg-[var(--rv-tint)]" : "hover:bg-[#fbfaf8]"}`}>
                <span className="truncate font-medium">{segShort(s)}</span>
                <span className="flex h-3"><span className="h-3 rounded-r-[4px]" style={{ width: `${(l.length / maxN) * 100}%`, background: seg === s ? "#232021" : "#3987E5", minWidth: 4 }} /></span>
                <span className="text-right text-xs font-bold tabular-nums">{l.length}</span>
              </button>
              <p className="pl-1 text-[11px] leading-snug text-[var(--rv-mute)]">{l.map((v) => (v.nameLocal ? `${v.name} ${v.nameLocal.split(" ")[0]}` : v.name)).join(" · ")}</p>
            </li>
          ))}
        </ul>
      </Card>
      <div className="mt-4">
        <p className="mb-2 text-sm font-bold">
          {seg === "all" ? "전체" : SEGMENTS[seg]} · {list.length}곳
          {seg !== "all" && <button type="button" onClick={() => setSeg("all")} className="ml-2 text-xs font-normal text-[var(--rv-accent)] underline">전체 보기</button>}
        </p>
        <VendorTable vendors={[...list].sort((a, b) => Number(!!b.rank) - Number(!!a.rank) || Number(!!b.korea) - Number(!!a.korea))} rankFirst />
      </div>
    </>
  );
}

/* ── 동종사 · 흐름 · 지표 ───────────────────────────── */

function PeersView({ d, tip }: { d: InsightsData; tip: TipApi }) {
  const [sel, setSel] = useState<string>();
  const [sig, setSig] = useState<StageKey>();
  const picked = d.peers.find((p) => p.name === sel);
  const list = picked ? picked.articles.filter((a) => !sig || a.signals.includes(sig)) : [];
  const pick = (name?: string, k?: StageKey) => {
    setSel(name);
    setSig(k);
  };
  const self = d.peers.find((p) => p.self);
  const top = [...d.peers].filter((p) => !p.self).sort((a, b) => b.total - a.total)[0];
  return (
    <>
      <Head title="국내 동종업계 동향" lead={`분석 기간에 국내 물류·유통 기업이 언급된 기사를 단계 신호별로 셌습니다.${top && top.total ? ` 기사가 가장 많은 곳은 ${top.name}(${top.total}건)` : ""}${self ? `, ${self.name}는 ${self.total}건입니다.` : ""}`} />
      <Card>
        <PeerBoard peers={d.peers} selected={sel} signal={sig} onSelect={pick} tip={tip} />
        {picked && (
          <div key={`${picked.name}-${sig ?? "all"}`} className="view-enter mt-4 rounded-lg border-2 border-[var(--rv-ink)] bg-[var(--wash)] p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">
                {picked.name} 기사{sig && <span className="ml-1.5 rounded-full bg-[var(--rv-accent)] px-2 py-0.5 text-xs text-white">{signalLabel(sig)}</span>}{" "}
                <span className="font-normal text-[var(--rv-mute)]">{list.length}건{!sig && picked.total > picked.articles.length ? ` (전체 ${picked.total}건 중 최신)` : ""}</span>
              </p>
              <div className="flex items-center gap-3 text-xs">
                {sig && <button type="button" onClick={() => setSig(undefined)} className="text-[var(--rv-accent)] underline">{picked.name} 전체 보기</button>}
                <button type="button" onClick={() => pick(undefined)} className="text-[var(--rv-soft)] underline">닫기</button>
              </div>
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-[var(--rv-mute)]">분석 기간에 이 회사가 언급된 기사가 없습니다.</p>
            ) : (
              <ul className="divide-y divide-[var(--rv-line)] rounded-md bg-white px-3">
                {list.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 py-2 text-sm">
                    <a href={a.link} target="_blank" rel="noreferrer" className="font-medium underline decoration-[var(--rv-line)] underline-offset-2 hover:decoration-[var(--rv-accent)]">{a.titleKo ?? a.title}</a>
                    <span className="text-[11px] text-[var(--rv-mute)]">{a.source} · {day(a.publishedAt)}</span>
                    {a.signals.map((k) => <span key={k} className="rounded-full border border-[var(--rv-line)] px-1.5 text-[10px] text-[var(--rv-soft)]">{signalLabel(k)}</span>)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
      <div className="mt-4">
        <Card title="CL사업부 우선 검토 보드" desc="열 = CL사업 연관도(팀 설정값) · 열 안 순서 = 최근 30일 기사 수">
          <div className="grid gap-3 sm:grid-cols-3">
            {d.board.map((col) => (
              <div key={col.relevance} className="rounded-md bg-[#f6f5f2] p-2.5">
                <p className="mb-2 text-xs font-bold">{["", "연관 낮음", "연관 중간", "연관 높음"][col.relevance]} <span className="text-[var(--rv-mute)]">{col.items.length}</span></p>
                <ul className="space-y-1.5">
                  {col.items.map((it) => (
                    <li key={it.name} className="rounded border border-[var(--rv-line)] bg-white px-2.5 py-1.5">
                      <span className="text-sm font-bold">{it.name}</span>
                      <span className="block text-[11px] text-[var(--rv-soft)]">{it.stage} · {it.count}건 · {pct(it.momentum)}</span>
                    </li>
                  ))}
                  {col.items.length === 0 && <li className="py-2 text-center text-xs text-[var(--rv-mute)]">언급 없음</li>}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function FlowView({ d, tip }: { d: InsightsData; tip: TipApi }) {
  return (
    <>
      <Head title="키워드·주간 흐름" lead="최근 2주에 늘어난 키워드와 12주 동안의 카테고리별 기사 흐름입니다." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="급상승 키워드" desc="최근 14일 기사 수 − 이전 8주 속도로 예상한 수 · 막대는 주별 기사 수"><MoverList rows={d.movers.rising} tip={tip} empty="눈에 띄게 늘어난 키워드가 없습니다." /></Card>
        <Card title="주춤한 키워드"><MoverList rows={d.movers.falling} tip={tip} empty="크게 줄어든 키워드가 없습니다." /></Card>
      </div>
      <div className="mt-4">
        <Card title="주간 카테고리 흐름" desc="최근 12주 · 한국 시간 월요일 시작">
          {d.weekly.series.length ? (
            <>
              <WeeklyBars weekly={d.weekly} tip={tip} />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--rv-soft)]">
                {d.weekly.series.map((s) => <span key={s.category} className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: catColor(s.category) }} />{s.category} {s.counts.reduce((a, b) => a + b, 0)}건</span>)}
              </div>
            </>
          ) : <p className="py-8 text-center text-sm text-[var(--rv-mute)]">최근 12주 기사가 없습니다.</p>}
        </Card>
      </div>
    </>
  );
}

function MarketView({ indicators, tip }: { indicators: Indicator[]; tip: TipApi }) {
  return (
    <>
      <Head title="물동량·운임 지표" lead="미국 연준(FRED) 무료 공개 데이터입니다. 매일 수집 때 갱신되며, 월간 지표라 한두 달 늦게 반영됩니다." />
      <div className="grid gap-3 sm:grid-cols-2">{indicators.map((ind) => <IndicatorCard key={ind.id} ind={ind} tip={tip} />)}</div>
    </>
  );
}

/* ── 외부 리포트 (Gartner · DHL · McKinsey) ───────────────────────────── */

function ExternalView({ id, d }: { id: ExternalSource["id"]; d: InsightsData }) {
  const src = EXTERNAL_SOURCES.find((x) => x.id === id)!;
  const mentions = d.external.find((x) => x.id === id);
  const ours = (tech: string) => d.hype.find((h) => h.name === tech);
  return (
    <>
      <Head
        title={src.name}
        lead={<>공개된 최신 발표의 핵심과, 우리 수집 기사 속 {src.by} 언급을 함께 봅니다. 발표 내용 확인일 {src.checkedAt.replaceAll("-", ".")}.</>}
        right={<a href={src.href} target="_blank" rel="noreferrer" className="rounded-md border border-[var(--rv-line)] bg-white px-3 py-1.5 text-xs font-bold hover:border-[var(--rv-ink)]">원문 사이트 ↗</a>}
      />
      {src.note && <p className="mb-4 rounded-md bg-[var(--wash)] px-3 py-2 text-xs text-[var(--rv-soft)]">{src.note}</p>}

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Card title="최신 공개 발표" desc="발표에 적힌 내용 그대로 옮겼습니다 (수치는 원문 기준)">
          <ol className="relative space-y-4 border-l-2 border-[var(--rv-line)] pl-4">
            {src.facts.map((f) => (
              <li key={f.title} className="relative">
                <span aria-hidden className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[var(--rv-accent)]" />
                <p className="font-display text-xs font-bold tabular-nums text-[var(--rv-accent)]">{f.date}</p>
                <p className="font-bold leading-snug">{f.title}</p>
                <ul className="mt-1 space-y-1 text-sm text-[var(--rv-soft)]">
                  {f.points.map((p) => <li key={p} className="flex gap-2"><span aria-hidden className="text-[var(--rv-mute)]">▪</span>{p}</li>)}
                </ul>
                <a href={f.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] underline decoration-[var(--rv-line)]">출처 ↗</a>
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-4">
          {src.compare && (
            <Card title={`${src.by} 발표 vs 우리 기사 기준`} desc="같은 기술을 두 기준으로 나란히 (우리 단계는 지금 분석 기간 기준)">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--rv-soft)]"><th className="pb-1">기술</th><th className="pb-1">{src.by}</th><th className="pb-1">우리 기사 기준</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--rv-line)]">
                  {src.compare.map((c) => {
                    const o = ours(c.tech);
                    return (
                      <tr key={c.tech}>
                        <td className="py-2 font-bold">{c.tech}</td>
                        <td className="py-2"><a href={c.url} target="_blank" rel="noreferrer" className="underline decoration-[var(--rv-line)]">{c.theirs}</a><span className="block text-[11px] text-[var(--rv-mute)]">{c.note}</span></td>
                        <td className="py-2">{o ? <><b>{o.stage}</b><span className="block text-[11px] text-[var(--rv-mute)]">기사 {o.count}건{o.confident ? "" : " · 신호 적음"}</span></> : <span className="text-[var(--rv-mute)]">기간 내 기사 없음</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
          <Card title={`수집 기사 속 ${src.by} 언급`} desc="분석 기간, 매일 자동 갱신">
            {!mentions || mentions.count === 0 ? (
              <p className="text-sm text-[var(--rv-mute)]">분석 기간에 {src.by}를 언급한 수집 기사가 없습니다.</p>
            ) : (
              <>
                <p className="mb-1 text-xs text-[var(--rv-soft)]"><b className="text-[var(--rv-ink)]">{mentions.count}건</b>{mentions.count > mentions.articles.length ? ` 중 최신 ${mentions.articles.length}건` : ""}</p>
                <ul className="divide-y divide-[var(--rv-line)]">
                  {mentions.articles.map((a) => (
                    <li key={a.id} className="py-2 text-sm leading-snug">
                      <a href={a.link} target="_blank" rel="noreferrer" className="font-medium underline decoration-[var(--rv-line)] underline-offset-2 hover:decoration-[var(--rv-accent)]">{a.titleKo ?? a.title}</a>
                      <span className="block text-[11px] text-[var(--rv-mute)]">{a.source} · {day(a.publishedAt)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

/* ── 방법론 ───────────────────────────── */

function MethodView({ d, vendors }: { d: InsightsData; vendors: Payload["vendors"] }) {
  const need = vendors.vendors.filter((v) => v.confidence !== "확인");
  const noKorea = vendors.vendors.filter((v) => !v.korea && v.country !== "KR");
  const noMarket = vendors.vendors.filter((v) => !v.markets?.length);
  const rows: [string, string][] = [
    ["성숙도", "기술이 언급된 기사의 단계 신호 가중 평균. 공개 0 · 투자 0.25 · 실증 0.6 · 도입 1. 중단·지연 같은 리스크 신호는 성숙도에 넣지 않고 경고(!)로 따로 표시"],
    ["관심도", "기간 안 추적 기술 언급 합계 중 그 기술의 비율 (언론 보도 점유율)"],
    ["과거 → 최근", "선택한 분석 기간을 반으로 나눠 앞쪽(과거)과 뒤쪽(최근)을 각각 계산"],
    ["사분면 기준", "최근 기간 기술들의 관심도·성숙도 중앙값. 세로(관심도)는 제곱근 눈금이라 한두 기술이 커도 나머지가 바닥에 눌리지 않음"],
    ["곡선 단계", "평균이 아니라 우세한 신호로 판정: 리스크(중단·지연) 신호 25% 이상(3건 이상)이면 검증의 골 · 시범+도입 증거가 75% 이상이면 생산성 안정, 50~75%면 실증 확산 · 공개+투자가 우세하면 기사가 충분할 때 기대 정점, 적으면 기술 태동. 툴팁에 판정 근거가 나옴"],
    ["단계 신호", "기사 제목·요약·번역 제목의 표현으로 판정 (도입·증설·수주 / 시범·실증 / 투자 유치·상장 / 공개·출시 / 중단·지연)"],
    ["CL사업 연관도", "팀 설정값 (src/config/insights.ts). 계산값이 아님"],
    ["공급사·순위", "웹 검색으로 확인한 기본 목록 + 시트 Vendors 탭 입력. 순위는 공개 순위표(MMH 등)나 상장 서류 근거가 있을 때만"],
  ];
  return (
    <>
      <Head title="방법론·데이터 출처" lead="경영진 보고와 전문가 검토에서 숫자의 근거를 설명할 수 있도록 계산 방법과 한계를 적었습니다." />
      <Card title="지표 정의">
        <dl className="divide-y divide-[var(--rv-line)] text-sm">
          {rows.map(([k, v]) => <div key={k} className="grid gap-1 py-2 sm:grid-cols-[140px_1fr]"><dt className="font-bold">{k}</dt><dd className="text-[var(--rv-soft)]">{v}</dd></div>)}
        </dl>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="데이터 범위와 한계">
          <ul className="space-y-1.5 text-sm text-[var(--rv-soft)]">
            <li>▪ 수집 기사 {d.coverage.total.toLocaleString()}건 ({day(d.coverage.first)} ~ {day(d.coverage.last)}), 분석 기간 내 {d.coverage.inWindow}건</li>
            <li>▪ 언론 보도량을 세므로 홍보가 많은 기술·기업이 크게 보일 수 있습니다. 매출·설치 대수 같은 시장 데이터가 아닙니다.</li>
            <li>▪ 신호 판정은 표현 일치 방식이라 문맥을 놓칠 수 있습니다. 근거 기사를 함께 확인하세요.</li>
            <li>▪ 성숙도 곡선 화면은 Gartner 평가가 아니라 같은 기사 신호로 그린 것입니다.</li>
          </ul>
        </Card>
        <Card title="팀이 채워 주면 좋은 정보" desc="구글 시트 Vendors 탭에 같은 회사명으로 한 줄을 추가하면 채운 칸만 덮어씁니다">
          <ul className="space-y-1.5 text-sm">
            <li><b>출처 보강</b> {need.length}곳: <span className="text-[var(--rv-soft)]">{need.map((v) => v.name).join(", ")}</span></li>
            <li><b>한국 사업·고객 확인</b> {noKorea.length}곳 (LX판토스 관점 핵심)</li>
            <li><b>공급 국가 입력</b> {noMarket.length}곳 (지도의 &lsquo;공급 국가&rsquo; 보기에 쓰임)</li>
            <li><b>중국 기업 순위</b>: GGII(高工产业研究院)·中国物流与采购联合会 등의 분야별 순위표가 있으면 &lsquo;순위·순위 근거&rsquo; 칸에</li>
            <li className="text-[var(--rv-mute)]">현재 시트에서 반영된 줄: {vendors.sheetRows}</li>
          </ul>
        </Card>
      </div>
      <div className="mt-4">
        <Card title="Vendors 탭 칸 설명">
          <p className="text-xs leading-relaxed text-[var(--rv-soft)]">회사명 · 현지명 · 본사국가(ISO2, 예: CN) · 도시 · 모회사 · 분야(; 구분: fullstack, asrs, amr, acr, sorter, picking, forklift, software 또는 한글 이름) · 대표 솔루션(;) · 공급국가(ISO2;) · 공급 범위 · 한국 사업 · 순위 · 순위 근거 · 출처 URL(;) · 확인 상태(확인/일부 확인/입력 필요) · 확인일</p>
        </Card>
      </div>
    </>
  );
}
