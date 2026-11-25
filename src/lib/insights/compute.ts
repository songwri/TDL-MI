import { CL_RELEVANCE, CURVE_STAGES, EXTERNAL_SOURCES, PEERS, STAGE_SIGNALS, TRACKED_TECH, type StageKey } from "@/config/insights";
import { extractKeywords, leadingSubject, mentionsEntity } from "@/lib/mi/matcher";
import { CATEGORIES, type Article, type Category } from "@/lib/types";

/**
 * 트렌드 인사이트 계산. 입력은 수집 기사뿐이고, 모든 숫자는 기사 수를 센 결과다(모델이 만들지 않음).
 */

export type Signals = Record<StageKey, number>;

export interface ArticleRef {
  id: string;
  title: string;
  titleKo?: string;
  link: string;
  source: string;
  publishedAt: string;
  signals: StageKey[];
  thumbnail?: string;
  category?: Category;
}

export interface HypePoint {
  name: string;
  category: Category;
  /** 기간 내 언급 기사 수 */
  count: number;
  /** 최근 30일 언급 기사 수 */
  recent: number;
  /** 최근 30일 하루 평균 ÷ 그 이전 하루 평균 - 1 (예: 0.5 = 50% 증가). 이전 기사가 없으면 null */
  momentum: number | null;
  signals: Signals;
  signalTotal: number;
  /** 곡선 위치: 가로 0~1, 세로 0~1 */
  x: number;
  y: number;
  stage: string;
  /** 단계 판정 근거 */
  why: string;
  /** 단계 신호가 3건 이상이면 true (적으면 위치가 흔들릴 수 있음) */
  confident: boolean;
  articles: ArticleRef[];
}

export interface Mover {
  name: string;
  recent: number;
  prior: number;
  /** 이전 기간 속도로 예상한 최근 기사 수 */
  expected: number;
  delta: number;
  /** 최근 8주 주별 기사 수 (오래된 순) */
  weeks: number[];
}

export interface PeerRow {
  name: string;
  self: boolean;
  total: number;
  signals: Signals;
  latest?: ArticleRef;
  /** 기간 내 그 회사 기사 (최신순, 최대 30건) */
  articles: ArticleRef[];
}

export interface BoardColumn {
  relevance: 1 | 2 | 3;
  items: { name: string; category: Category; stage: string; count: number; momentum: number | null }[];
}

export interface InsightsData {
  generatedAt: string;
  window: { days: number; from: string; to: string };
  coverage: { total: number; inWindow: number; first?: string; last?: string };
  hype: HypePoint[];
  movers: { rising: Mover[]; falling: Mover[] };
  weekly: { weeks: { start: string; label: string }[]; series: { category: Category; counts: number[] }[] };
  peers: PeerRow[];
  board: BoardColumn[];
  portfolio: PortfolioData;
  now: NowData;
  /** 외부 기관(Gartner·DHL·McKinsey)을 언급한 수집 기사 (분석 기간, 최신순 최대 20건) */
  external: { id: string; count: number; articles: ArticleRef[] }[];
}

/** 기간 하나의 위치: 관심도(추적 기술 언급 중 점유율) · 성숙도(도입·실증 신호 비중 지수) */
export interface PeriodPos {
  count: number;
  share: number;
  /** 0~1. 공개 0 · 투자 0.25 · 실증 0.6 · 도입 1 의 가중 평균. 신호가 없으면 null */
  maturity: number | null;
}

export interface PortfolioPoint {
  name: string;
  category: Category;
  relevance: 1 | 2 | 3;
  recent: PeriodPos;
  past: PeriodPos;
  /** 최근 기간 신호 중 리스크·과제(중단·지연 등) 비중 */
  doubtShare: number;
  signals: Signals;
}

export interface PortfolioData {
  recentFrom: string;
  pastFrom: string;
  points: PortfolioPoint[];
  /** 사분면 기준선: 최근 기간 중앙값 */
  median: { share: number; maturity: number };
}

export interface NowData {
  kpis: { key: string; label: string; value: number; prev: number; note: string }[];
  highlights: string[];
  /** 분석 기간 기사 구성: 기사마다 대표 신호 하나 (원그래프와 아래 묶음이 같은 기준) */
  mix: { key: StageKey | "none"; count: number }[];
  /** 대표 신호별 최신 기사 (count = 그 묶음 전체 기사 수) */
  feed: { signal: StageKey; count: number; items: (ArticleRef & { techs: string[] })[] }[];
}

/** 대표 신호: 리스크 > 도입 > 실증 > 투자 > 공개. 예) "시범 운영 지연" → 리스크·과제 */
export const PRIMARY_ORDER: StageKey[] = ["doubt", "adopt", "pilot", "invest", "launch"];
export const primarySignal = (signals: StageKey[]): StageKey | "none" => PRIMARY_ORDER.find((k) => signals.includes(k)) ?? "none";

const DAY = 86_400_000;
/** 성숙도 지수 가중치 (리스크·과제는 성숙도가 아니라 별도 경고로 표시) */
export const MATURITY_WEIGHT: Partial<Record<StageKey, number>> = { launch: 0, invest: 0.25, pilot: 0.6, adopt: 1 };

export function maturityOf(signals: Signals): number | null {
  let n = 0, sum = 0;
  for (const [k, w] of Object.entries(MATURITY_WEIGHT) as [StageKey, number][]) {
    n += signals[k];
    sum += signals[k] * w;
  }
  return n ? sum / n : null;
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const RECENT_DAYS = 30;
const MOVER_DAYS = 14;

/** 하이프 사이클 모양 곡선: 기대 정점(가로 0.3) → 골(0.5) → 완만한 상승 → 안정 */
export function curveY(x: number): number {
  const peak = 0.9 * Math.exp(-(((x - 0.3) / 0.1) ** 2));
  const slope = 0.55 / (1 + Math.exp(-(x - 0.75) / 0.07));
  return Math.min(1, peak + slope + 0.04);
}

export interface StageCall {
  /** 곡선 위 가로 위치 (0~1) */
  x: number;
  stage: string;
  /** 판정 근거 (툴팁에 그대로 보여 줌) */
  why: string;
}

/**
 * 하이프 사이클 단계 판정 (신호 비율 규칙).
 *
 * 예전에는 신호 위치의 평균으로 정했는데, 공개·투자(앞쪽)와 도입(뒤쪽) 기사가 섞이면 평균이 늘 가운데(검증의 골)로 쏠렸다.
 * 이제는 '무엇이 우세한가'로 단계를 먼저 정하고, 단계 안에서의 위치만 비율로 정한다.
 *
 *   리스크(중단·지연 등) 신호가 25% 이상이고 3건 이상 → 검증의 골
 *   그 밖에는 증거 비율 = (시범+도입) ÷ (공개+투자+시범+도입)
 *     75% 이상 → 생산성 안정 · 50~75% → 실증 확산
 *     50% 미만(공개·투자가 우세) → 기사가 충분히 많으면 기대 정점, 적으면 기술 태동
 */
export function classifyStage(sig: Signals, count: number, medianCount: number): StageCall {
  const S = sig.launch + sig.invest + sig.pilot + sig.adopt + sig.doubt;
  if (!S) return { x: 0.1, stage: stageOf(0.1), why: "단계 신호 없음 (언급만 있음)" };
  const pctOf = (n: number) => `${Math.round((n / S) * 100)}%`;
  const hype = sig.launch + sig.invest;
  const proof = sig.pilot + sig.adopt;
  const dShare = sig.doubt / S;
  const ratio = proof / Math.max(hype + proof, 1);
  const mix = `공개·투자 ${pctOf(hype)} · 시범·도입 ${pctOf(proof)} · 리스크 ${pctOf(sig.doubt)}`;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  if (sig.doubt >= 3 && dShare >= 0.25) {
    const x = 0.45 + clamp((dShare - 0.25) / 0.35, 0, 1) * 0.13; // 리스크 비중이 클수록 골 깊숙이
    return { x, stage: stageOf(x), why: `리스크 신호 비중 ${pctOf(sig.doubt)} (25% 이상) · ${mix}` };
  }
  if (ratio >= 0.75) {
    const x = 0.82 + clamp((ratio - 0.75) / 0.25, 0, 1) * 0.15;
    return { x, stage: stageOf(x), why: `시범·도입 증거가 ${Math.round(ratio * 100)}% · ${mix}` };
  }
  if (ratio >= 0.5) {
    const x = 0.62 + clamp((ratio - 0.5) / 0.25, 0, 1) * 0.16;
    return { x, stage: stageOf(x), why: `시범·도입 증거가 ${Math.round(ratio * 100)}% · ${mix}` };
  }
  // 공개·투자가 우세: 기사가 충분히 많으면 기대 정점, 적으면 태동
  if (count >= Math.max(4, medianCount)) {
    const x = 0.25 + (sig.invest / Math.max(hype, 1)) * 0.15; // 투자 기사가 많을수록 정점 쪽
    return { x, stage: stageOf(x), why: `공개·투자가 우세 (증거 ${Math.round(ratio * 100)}%) · 기사 ${count}건으로 관심 높음 · ${mix}` };
  }
  const x = 0.06 + ratio * 0.28;
  return { x, stage: stageOf(x), why: `공개·투자가 우세하나 기사 ${count}건으로 아직 적음 · ${mix}` };
}

export function stageOf(x: number): string {
  return (CURVE_STAGES.find((s) => x >= s.from && x < s.to) ?? CURVE_STAGES[CURVE_STAGES.length - 1]).label;
}

export function detectSignals(text: string): StageKey[] {
  return STAGE_SIGNALS.filter((s) => s.re.test(text)).map((s) => s.key);
}

const emptySignals = (): Signals => Object.fromEntries(STAGE_SIGNALS.map((s) => [s.key, 0])) as Signals;

/** 한국 시간 기준 그 주 월요일 (YYYY-MM-DD) */
export function weekStart(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000);
  const dow = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow)).toISOString().slice(0, 10);
}

interface Prepared {
  a: Article;
  t: number;
  names: Set<string>;
  signals: StageKey[];
  /** 기술 언급 여부와 무관하게 찾은 신호 (동종사 기사처럼 기업 소식 자체를 볼 때 사용) */
  allSignals: StageKey[];
  /** 제목·요약(소문자): 본문 속 지나가는 언급과 구분하기 위함 */
  headline: string;
  /** 제목 맨 앞 "회사명," 의 회사 */
  lead: string | null;
}

function prepare(articles: Article[]): Prepared[] {
  return articles
    .map((a) => {
      const text = `${a.title} ${a.titleKo ?? ""} ${a.summary}`;
      // 사전이 바뀌어도 예전 기사에 반영되도록 제목·요약에서 다시 찾고, 수집 때 본문까지 보고 찾은 키워드를 합친다
      const names = new Set([...a.keywords, ...extractKeywords(text)]);
      // 기술 위주 분류: 추적 기술이 언급된 기사만 단계 신호를 센다 (기업·행사 이야기에 섞인 '도입·확대' 같은 말이 기술 단계로 잡히지 않게)
      const techy = TRACKED_TECH.some((t) => names.has(t.name));
      return { a, t: new Date(a.publishedAt).getTime(), names, signals: techy ? detectSignals(text) : [], allSignals: detectSignals(text), headline: text.toLowerCase(), lead: leadingSubject(`${a.titleKo || a.title}`) ?? leadingSubject(a.title) };
    })
    .filter((p) => !Number.isNaN(p.t));
}

const ref = (p: Prepared): ArticleRef => ({
  id: p.a.id,
  title: p.a.title,
  titleKo: p.a.titleKo,
  link: p.a.link,
  source: p.a.source,
  publishedAt: p.a.publishedAt,
  signals: p.signals,
  thumbnail: p.a.thumbnail,
  category: p.a.category,
});

export function computeInsights(articles: Article[], opts: { days?: number; now?: Date } = {}): InsightsData {
  const now = (opts.now ?? new Date()).getTime();
  const days = opts.days ?? 180;
  const from = now - days * DAY;
  const all = prepare(articles);
  const inWin = all.filter((p) => p.t >= from && p.t <= now + DAY).sort((x, y) => y.t - x.t);
  const recentFrom = now - RECENT_DAYS * DAY;

  /* 기술 성숙도 맵 */
  const techRows = TRACKED_TECH.flatMap(({ name, category }) => {
    const hits = inWin.filter((p) => p.names.has(name));
    if (!hits.length) return [];
    const signals = emptySignals();
    for (const h of hits) for (const sg of h.signals) signals[sg]++;
    return [{ name, category, hits, signals }];
  });
  const sortedCounts = techRows.map((r) => r.hits.length).sort((a, b) => a - b);
  const medianCount = sortedCounts.length ? sortedCounts[Math.floor(sortedCounts.length / 2)] : 0;
  const hype: HypePoint[] = techRows.map(({ name, category, hits, signals }) => {
    const signalTotal = Object.values(signals).reduce((n, v) => n + v, 0);
    const call = classifyStage(signals, hits.length, medianCount);
    const recent = hits.filter((p) => p.t >= recentFrom).length;
    const priorDays = days - RECENT_DAYS;
    const prior = hits.length - recent;
    const momentum = priorDays > 0 && prior > 0 ? recent / RECENT_DAYS / (prior / priorDays) - 1 : null;
    return { name, category, count: hits.length, recent, momentum, signals, signalTotal, x: call.x, y: curveY(call.x), stage: call.stage, why: call.why, confident: signalTotal >= 3, articles: hits.slice(0, 6).map(ref) };
  });

  /* 급상승·주춤 키워드: 최근 14일 vs 그 전 56일 속도 */
  const mFrom = now - MOVER_DAYS * DAY;
  const pFrom = mFrom - 56 * DAY;
  const weeksBack = Array.from({ length: 8 }, (_, i) => weekStart(new Date(now - (7 - i) * 7 * DAY).toISOString()));
  const counts = new Map<string, { recent: number; prior: number; weeks: number[] }>();
  for (const p of all) {
    if (p.t < pFrom || p.t > now + DAY) continue;
    const wi = weeksBack.indexOf(weekStart(p.a.publishedAt));
    for (const n of p.names) {
      const c = counts.get(n) ?? { recent: 0, prior: 0, weeks: Array(8).fill(0) };
      if (p.t >= mFrom) c.recent++;
      else c.prior++;
      if (wi >= 0) c.weeks[wi]++;
      counts.set(n, c);
    }
  }
  const movers = [...counts.entries()].map(([name, c]) => {
    const expected = (c.prior * MOVER_DAYS) / 56;
    return { name, recent: c.recent, prior: c.prior, expected: Math.round(expected * 10) / 10, delta: Math.round((c.recent - expected) * 10) / 10, weeks: c.weeks };
  });
  const rising = movers.filter((m) => m.recent >= 2 && m.delta > 0).sort((a, b) => b.delta - a.delta || b.recent - a.recent).slice(0, 8);
  const falling = movers.filter((m) => m.prior >= 3 && m.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);

  /* 주간 카테고리 흐름 (최근 12주) */
  const wkStarts = Array.from({ length: 12 }, (_, i) => weekStart(new Date(now - (11 - i) * 7 * DAY).toISOString()));
  const series = CATEGORIES.map((category) => ({
    category,
    counts: wkStarts.map((w) => all.filter((p) => p.a.category === category && weekStart(p.a.publishedAt) === w).length),
  })).filter((s) => s.counts.some((v) => v > 0));
  const weekly = { weeks: wkStarts.map((start) => ({ start, label: `${Number(start.slice(5, 7))}/${Number(start.slice(8, 10))}` })), series };

  /* 동종사 레이더 */
  const peers: PeerRow[] = PEERS.map(({ name, self }) => {
    // 동종사: 제목·요약에 이름이 나온 기사만 (본문 끝에 스쳐 지나가는 언급은 제외)
    // 제목이 "회사명, …" 로 시작하면 그 회사 기사로 본다. 별칭(예: 대한통운)도 같은 회사로 센다
    const hits = inWin.filter((p) => p.lead === name || (p.names.has(name) && mentionsEntity(p.headline, name)));
    const signals = emptySignals();
    // 동종사는 기업 소식 자체를 보는 화면이라 기술 언급이 없어도 신호를 센다 (제목·요약에 이름이 나온 기사로 이미 좁혔다)
    const refAll = (p: Prepared) => ({ ...ref(p), signals: p.allSignals });
    for (const h of hits) for (const s of h.allSignals) signals[s]++;
    return { name, self: !!self, total: hits.length, signals, latest: hits[0] ? refAll(hits[0]) : undefined, articles: hits.slice(0, 30).map(refAll) };
  });

  /* CL사업부 우선 검토 보드: 연관도 열 × 모멘텀 순 */
  const board: BoardColumn[] = ([3, 2, 1] as const).map((relevance) => ({
    relevance,
    items: hype
      .filter((h) => (CL_RELEVANCE[h.name] ?? 1) === relevance)
      .sort((a, b) => b.recent - a.recent || (b.momentum ?? -1) - (a.momentum ?? -1) || b.count - a.count)
      .map((h) => ({ name: h.name, category: h.category, stage: h.stage, count: h.count, momentum: h.momentum })),
  }));

  /* LX판토스 기술 포트폴리오: 기간을 반으로 나눠 과거 → 최근 위치 변화 */
  const half = from + (now - from) / 2;
  const techNames = TRACKED_TECH.map((t) => t.name);
  const periodStats = (lo: number, hi: number) => {
    const ps = inWin.filter((p) => p.t >= lo && p.t < hi);
    const per = new Map(techNames.map((n) => [n, { count: 0, signals: emptySignals() }]));
    for (const p of ps) for (const n of techNames) if (p.names.has(n)) {
      const e = per.get(n)!;
      e.count++;
      for (const sg of p.signals) e.signals[sg]++;
    }
    const total = [...per.values()].reduce((a, e) => a + e.count, 0) || 1;
    return new Map([...per.entries()].map(([n, e]) => [n, { count: e.count, share: e.count / total, maturity: maturityOf(e.signals), signals: e.signals }]));
  };
  const rec = periodStats(half, now + DAY);
  const pst = periodStats(from, half);
  const points: PortfolioPoint[] = TRACKED_TECH.filter((t) => (rec.get(t.name)?.count ?? 0) > 0).map(({ name, category }) => {
    const r = rec.get(name)!, q = pst.get(name)!;
    const sigTotal = Object.values(r.signals).reduce((a, b) => a + b, 0);
    return {
      name, category, relevance: CL_RELEVANCE[name] ?? 1,
      recent: { count: r.count, share: r.share, maturity: r.maturity },
      past: { count: q.count, share: q.share, maturity: q.maturity },
      doubtShare: sigTotal ? r.signals.doubt / sigTotal : 0,
      signals: r.signals,
    };
  });
  const portfolio: PortfolioData = {
    recentFrom: new Date(half).toISOString(),
    pastFrom: new Date(from).toISOString(),
    points,
    median: { share: median(points.map((p) => p.recent.share)), maturity: median(points.flatMap((p) => (p.recent.maturity === null ? [] : [p.recent.maturity]))) },
  };

  /* 최근 근황: 최근 30일 vs 그 전 30일 */
  const last = all.filter((p) => p.t >= recentFrom && p.t <= now + DAY).sort((x, y) => y.t - x.t);
  const prev = all.filter((p) => p.t >= recentFrom - RECENT_DAYS * DAY && p.t < recentFrom);
  const withSig = (ps: Prepared[], k: StageKey) => ps.filter((p) => p.signals.includes(k)).length;
  const techCount = (ps: Prepared[]) => {
    const m = new Map<string, number>();
    for (const p of ps) for (const n of techNames) if (p.names.has(n)) m.set(n, (m.get(n) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const topNow = techCount(last)[0];
  const prevTech = new Map(techCount(prev));
  const kpis = [
    { key: "all", label: "최근 30일 기사", value: last.length, prev: prev.length, note: "수집된 물류·로봇 기사" },
    { key: "adopt", label: "도입·확산 기사", value: withSig(last, "adopt"), prev: withSig(prev, "adopt"), note: "도입·증설·수주·계약 표현" },
    { key: "pilot", label: "실증·시범 기사", value: withSig(last, "pilot"), prev: withSig(prev, "pilot"), note: "시범·실증·PoC 표현" },
    { key: "invest", label: "투자 기사", value: withSig(last, "invest"), prev: withSig(prev, "invest"), note: "투자 유치·인수·상장 표현" },
  ];
  const highlights: string[] = [];
  if (topNow) highlights.push(`최근 30일 가장 많이 다뤄진 기술은 ${topNow[0]}(${topNow[1]}건, 직전 30일 ${prevTech.get(topNow[0]) ?? 0}건)입니다.`);
  const adoptTop = techCount(last.filter((p) => p.signals.includes("adopt")))[0];
  if (adoptTop) highlights.push(`도입·확산 신호가 가장 많은 기술은 ${adoptTop[0]}(${adoptTop[1]}건)입니다.`);
  const grow = techCount(last).map(([n, c]) => ({ n, c, d: c - (prevTech.get(n) ?? 0) })).filter((x) => x.d > 0 && x.c >= 2).sort((a, b) => b.d - a.d)[0];
  if (grow && grow.n !== topNow?.[0]) highlights.push(`직전 30일보다 가장 많이 늘어난 기술은 ${grow.n}(+${grow.d}건)입니다.`);
  const self = PEERS.find((p) => p.self);
  if (self) {
    const mine = last.filter((p) => p.names.has(self.name)).length;
    const peerMax = PEERS.filter((p) => !p.self).map((p) => ({ n: p.name, c: last.filter((q) => q.names.has(p.name)).length })).sort((a, b) => b.c - a.c)[0];
    if (peerMax && peerMax.c > 0) highlights.push(`동종업계 중 최근 30일 기사가 가장 많은 곳은 ${peerMax.n}(${peerMax.c}건)이며, ${self.name} 관련 기사는 ${mine}건입니다.`);
  }
  const byPrimary = new Map<StageKey | "none", Prepared[]>();
  for (const p of inWin) {
    const k = primarySignal(p.signals);
    byPrimary.set(k, [...(byPrimary.get(k) ?? []), p]);
  }
  const mix = ([...PRIMARY_ORDER, "none"] as (StageKey | "none")[]).map((key) => ({ key, count: byPrimary.get(key)?.length ?? 0 }));
  const feed = (["adopt", "pilot", "invest", "launch", "doubt"] as StageKey[]).map((signal) => {
    const ps = byPrimary.get(signal) ?? [];
    return { signal, count: ps.length, items: ps.slice(0, 8).map((p) => ({ ...ref(p), techs: techNames.filter((n) => p.names.has(n)) })) };
  });
  const nowData: NowData = { kpis, highlights, mix, feed };

  const dates = all.map((p) => p.a.publishedAt).sort();
  return {
    generatedAt: new Date(now).toISOString(),
    window: { days, from: new Date(from).toISOString(), to: new Date(now).toISOString() },
    coverage: { total: all.length, inWindow: inWin.length, first: dates[0], last: dates[dates.length - 1] },
    hype,
    movers: { rising, falling },
    weekly,
    peers,
    board,
    portfolio,
    now: nowData,
    external: EXTERNAL_SOURCES.map(({ id, match }) => {
      const hits = inWin.filter((p) => match.test(`${p.a.title} ${p.a.titleKo ?? ""} ${p.a.summary}`));
      return { id, count: hits.length, articles: hits.slice(0, 20).map(ref) };
    }),
  };
}
