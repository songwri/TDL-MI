import { CATEGORIES, type Article, type NewsletterIssue, type ReportStats } from "@/lib/types";
import { analyzeArticles } from "@/lib/mi";

const count = <T,>(xs: T[], key: (x: T) => string) => {
  const m = new Map<string, number>();
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
  return m;
};
const sorted = (m: Map<string, number>) => [...m].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

/**
 * 리포트 통계 (코드로 계산하므로 Claude 가 숫자를 만들어 내지 않는다)
 * - 이번 호: 선정 기사의 카테고리·지역·키워드 분포, 지난 호와의 관계(신규/후속/중복)
 * - 추세: 최근 최대 `window`개 호 + 이번 호의 카테고리·키워드 건수 (모두 구글 시트의 이력에서 계산)
 */
export function computeStats(
  selected: Article[],
  issues: NewsletterIssue[],
  allArticles: Article[],
  opts: { issueNo: number; publishDate: string; window?: number; now?: Date },
): ReportStats {
  const byId = new Map(allArticles.map((a) => [a.id, a]));
  const past = issues
    .filter((i) => i.issueNo !== opts.issueNo && i.issueNo < opts.issueNo)
    .sort((a, b) => a.issueNo - b.issueNo)
    .slice(-(opts.window ?? 5));

  const groups: { no: number; date: string; current: boolean; articles: Article[] }[] = [
    ...past.map((i) => ({
      no: i.issueNo,
      date: i.publishDate,
      current: false,
      articles: i.articleIds.map((id) => byId.get(id)).filter((a): a is Article => !!a),
    })),
    { no: opts.issueNo, date: opts.publishDate, current: true, articles: selected },
  ];

  const catCounts = count(selected, (a) => a.category);
  const byCategory = CATEGORIES.map((label) => ({ label: label as string, count: catCounts.get(label) ?? 0 })).filter((c) => c.count > 0);
  const regionCounts = count(selected, (a) => (a.region === "KR" ? "국내" : "해외"));
  const byRegion = ["국내", "해외"].map((label) => ({ label, count: regionCounts.get(label) ?? 0 })).filter((r) => r.count > 0);
  const topKeywords = sorted(count(selected.flatMap((a) => a.keywords), (k) => k)).slice(0, 8);

  const intel = analyzeArticles(selected, issues, allArticles, { excludeIssueNo: opts.issueNo, now: opts.now });
  const kind = (id: string) => {
    const rel = intel.find((i) => i.articleId === id)?.relations ?? [];
    if (rel.some((r) => r.kind === "duplicate")) return "duplicate" as const;
    if (rel.some((r) => r.kind === "follow-up" || r.kind === "related")) return "followUp" as const;
    return "fresh" as const;
  };
  const repeat = { fresh: 0, followUp: 0, duplicate: 0 };
  for (const a of selected) repeat[kind(a.id)]++;

  // 추세용 키워드: 비교 기간 전체에서 많이 나온 순 상위 8개
  const kwTotals = new Map<string, number>();
  for (const g of groups) for (const a of g.articles) for (const k of new Set(a.keywords)) kwTotals.set(k, (kwTotals.get(k) ?? 0) + 1);
  const trendKeywords = sorted(kwTotals).slice(0, 8).map((k) => k.label);

  return {
    total: selected.length,
    byCategory,
    byRegion,
    topKeywords,
    repeat,
    trend: {
      issues: groups.map(({ no, date, current }) => ({ no, date, current })),
      category: CATEGORIES.map((label) => ({ label: label as string, counts: groups.map((g) => g.articles.filter((a) => a.category === label).length) })).filter((c) =>
        c.counts.some((n) => n > 0),
      ),
      keywords: trendKeywords.map((label) => ({ label, counts: groups.map((g) => g.articles.filter((a) => a.keywords.includes(label)).length) })),
    },
  };
}

/** 프롬프트에 넣을 통계 요약 (Claude 가 인용할 수 있도록 문장형) */
export function statsToText(s: ReportStats): string {
  const issues = s.trend.issues.map((i) => `제${i.no}호${i.current ? "(이번 호)" : ""}`);
  const row = (label: string, counts: number[]) => `  - ${label}: ${counts.map((n, i) => `${issues[i]} ${n}건`).join(", ")}`;
  return `- 이번 호 선정 기사: ${s.total}건
- 카테고리: ${s.byCategory.map((c) => `${c.label} ${c.count}건`).join(", ")}
- 지역: ${s.byRegion.map((r) => `${r.label} ${r.count}건`).join(", ")}
- 많이 언급된 기업·기술: ${s.topKeywords.map((k) => `${k.label} ${k.count}건`).join(", ") || "없음"}
- 지난 호와의 관계: 신규 ${s.repeat.fresh}건, 후속·연관 ${s.repeat.followUp}건, 중복 가능 ${s.repeat.duplicate}건
- 호별 카테고리 추이${s.trend.issues.length > 1 ? "" : " (비교할 지난 호 없음)"}:
${s.trend.category.map((c) => row(c.label, c.counts)).join("\n")}
- 호별 키워드 등장:
${s.trend.keywords.map((k) => row(k.label, k.counts)).join("\n")}`;
}
