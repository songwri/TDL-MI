import { CL_RELEVANCE, CURVE_STAGES, PEERS, STAGE_SIGNALS, TRACKED_TECH, type StageKey } from "@/config/insights";
import { extractKeywords } from "@/lib/mi/matcher";
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
}

const DAY = 86_400_000;
const RECENT_DAYS = 30;
const MOVER_DAYS = 14;

/** 하이프 사이클 모양 곡선: 기대 정점(가로 0.3) → 골(0.5) → 완만한 상승 → 안정 */
export function curveY(x: number): number {
  const peak = 0.9 * Math.exp(-(((x - 0.3) / 0.1) ** 2));
  const slope = 0.55 / (1 + Math.exp(-(x - 0.75) / 0.07));
  return Math.min(1, peak + slope + 0.04);
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
}

function prepare(articles: Article[]): Prepared[] {
  return articles
    .map((a) => {
      const text = `${a.title} ${a.titleKo ?? ""} ${a.summary}`;
      // 사전이 바뀌어도 예전 기사에 반영되도록 제목·요약에서 다시 찾고, 수집 때 본문까지 보고 찾은 키워드를 합친다
      const names = new Set([...a.keywords, ...extractKeywords(text)]);
      return { a, t: new Date(a.publishedAt).getTime(), names, signals: detectSignals(text) };
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
});

export function computeInsights(articles: Article[], opts: { days?: number; now?: Date } = {}): InsightsData {
  const now = (opts.now ?? new Date()).getTime();
  const days = opts.days ?? 180;
  const from = now - days * DAY;
  const all = prepare(articles);
  const inWin = all.filter((p) => p.t >= from && p.t <= now + DAY).sort((x, y) => y.t - x.t);
  const recentFrom = now - RECENT_DAYS * DAY;

  /* 기술 성숙도 맵 */
  const hype: HypePoint[] = TRACKED_TECH.flatMap(({ name, category }) => {
    const hits = inWin.filter((p) => p.names.has(name));
    if (!hits.length) return [];
    const signals = emptySignals();
    for (const h of hits) for (const s of h.signals) signals[s]++;
    const signalTotal = Object.values(signals).reduce((n, v) => n + v, 0);
    const x = signalTotal ? STAGE_SIGNALS.reduce((sum, s) => sum + s.pos * signals[s.key], 0) / signalTotal : STAGE_SIGNALS[0].pos;
    const recent = hits.filter((p) => p.t >= recentFrom).length;
    const priorDays = days - RECENT_DAYS;
    const prior = hits.length - recent;
    const momentum = priorDays > 0 && prior > 0 ? recent / RECENT_DAYS / (prior / priorDays) - 1 : null;
    return [{ name, category, count: hits.length, recent, momentum, signals, signalTotal, x, y: curveY(x), stage: stageOf(x), confident: signalTotal >= 3, articles: hits.slice(0, 6).map(ref) }];
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
    const hits = inWin.filter((p) => p.names.has(name));
    const signals = emptySignals();
    for (const h of hits) for (const s of h.signals) signals[s]++;
    return { name, self: !!self, total: hits.length, signals, latest: hits[0] ? ref(hits[0]) : undefined };
  });

  /* CL사업부 우선 검토 보드: 연관도 열 × 모멘텀 순 */
  const board: BoardColumn[] = ([3, 2, 1] as const).map((relevance) => ({
    relevance,
    items: hype
      .filter((h) => (CL_RELEVANCE[h.name] ?? 1) === relevance)
      .sort((a, b) => b.recent - a.recent || (b.momentum ?? -1) - (a.momentum ?? -1) || b.count - a.count)
      .map((h) => ({ name: h.name, category: h.category, stage: h.stage, count: h.count, momentum: h.momentum })),
  }));

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
  };
}
