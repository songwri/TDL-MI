import { issueLabel } from "@/config/brand";
import { ENTITIES } from "@/config/taxonomy";
import { config } from "@/lib/config";
import type { Article, ArticleIntel, IssueRelation, NewsletterIssue, RelationKind } from "@/lib/types";
import { normalizeUrl, shortDate } from "@/lib/utils/text";
import { extractKeywords } from "./matcher";

/**
 * Market Intelligence 이력 매칭 엔진
 *  1) 엔티티 매칭: 기업/솔루션/기술 사전 기반 공통 키워드 (가중치: 기업·솔루션 1.0, 기술 0.5)
 *  2) TF-IDF 코사인 유사도: 제목+요약 토큰 (영문 단어 + 한글 2-gram)
 *  score = 0.6 * min(1, 엔티티가중치/2) + 0.4 * cosine
 */

const KIND = new Map(ENTITIES.map((e) => [e.canonical, e.kind]));
const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "are", "its", "has", "have", "will", "into", "new", "more",
  "said", "says", "than", "over", "about", "after", "their", "they", "which", "was", "were", "been", "also",
]);

export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const w of text.toLowerCase().match(/[a-z][a-z0-9+\-/]{2,}|[가-힣]+/g) ?? []) {
    if (/^[가-힣]+$/.test(w)) {
      if (w.length === 1) continue;
      for (let i = 0; i < w.length - 1; i++) out.push(w.slice(i, i + 2));
    } else if (!STOP.has(w)) out.push(w);
  }
  return out;
}

type Vec = Map<string, number>;

function tf(tokens: string[]): Vec {
  const v: Vec = new Map();
  for (const t of tokens) v.set(t, (v.get(t) ?? 0) + 1);
  return v;
}

function cosine(a: Vec, b: Vec, idf: Map<string, number>): number {
  let dot = 0, na = 0, nb = 0;
  for (const [t, c] of a) {
    const w = c * (idf.get(t) ?? 1);
    na += w * w;
    const cb = b.get(t);
    if (cb) dot += w * cb * (idf.get(t) ?? 1);
  }
  for (const [t, c] of b) {
    const w = c * (idf.get(t) ?? 1);
    nb += w * w;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

interface Doc {
  text: string;
  keywords: string[];
  link?: string;
  articleId?: string;
  title?: string;
}

const docText = (a: Pick<Article, "title" | "summary">) => `${a.title} ${a.title} ${a.summary}`;

function entityWeight(shared: string[]) {
  return shared.reduce((s, k) => s + (KIND.get(k) === "tech" ? 0.5 : 1), 0);
}

/** 과거 호수별 비교 대상 문서 (기사 정보가 없으면 콘셉트+키워드로 대체) */
function issueDocs(issue: NewsletterIssue, articleById: Map<string, Article>): Doc[] {
  const docs: Doc[] = issue.articleIds
    .map((id) => articleById.get(id))
    .filter((a): a is Article => !!a)
    .map((a) => ({
      text: docText(a),
      keywords: a.keywords.length ? a.keywords : extractKeywords(docText(a)),
      link: a.link,
      articleId: a.id,
      title: a.title,
    }));
  if (!docs.length) {
    docs.push({ text: `${issue.concept} ${issue.headline ?? ""} ${issue.keywords.join(" ")}`, keywords: issue.keywords });
  }
  return docs;
}

export function analyzeArticles(
  targets: Article[],
  issues: NewsletterIssue[],
  allArticles: Article[],
  opts: { lookbackDays?: number; now?: Date; excludeIssueNo?: number } = {},
): ArticleIntel[] {
  const now = opts.now ?? new Date();
  const since = now.getTime() - (opts.lookbackDays ?? config.miLookbackDays) * 86_400_000;
  const articleById = new Map(allArticles.map((a) => [a.id, a]));
  const pastIssues = issues.filter(
    (i) => i.issueNo !== opts.excludeIssueNo && new Date(i.publishDate).getTime() >= since,
  );
  const perIssue = pastIssues.map((issue) => ({ issue, docs: issueDocs(issue, articleById) }));

  // IDF: 과거 문서 + 대상 문서
  const corpus = [...perIssue.flatMap((p) => p.docs.map((d) => d.text)), ...targets.map(docText)].map(tokenize);
  const df = new Map<string, number>();
  for (const toks of corpus) for (const t of new Set(toks)) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = new Map([...df].map(([t, n]) => [t, Math.log(1 + corpus.length / n)]));
  const vecCache = new Map<string, Vec>();
  const vec = (text: string) => {
    let v = vecCache.get(text);
    if (!v) vecCache.set(text, (v = tf(tokenize(text))));
    return v;
  };

  return targets.map((target) => {
    const tKeywords = target.keywords.length ? target.keywords : extractKeywords(docText(target));
    const tVec = vec(docText(target));
    const tLink = normalizeUrl(target.link);
    const relations: IssueRelation[] = [];

    for (const { issue, docs } of perIssue) {
      if (target.publishedInIssue === issue.issueNo) continue;
      let best: IssueRelation | null = null;
      for (const d of docs) {
        const shared = tKeywords.filter((k) => d.keywords.includes(k));
        const cos = cosine(tVec, vec(d.text), idf);
        const sameLink = !!d.link && normalizeUrl(d.link) === tLink;
        const score = sameLink ? 1 : 0.6 * Math.min(1, entityWeight(shared) / 2) + 0.4 * cos;
        const hasCompany = shared.some((k) => KIND.get(k) !== "tech");
        if (score < 0.3 && !hasCompany) continue;
        const kind: RelationKind =
          sameLink || cos > 0.6
            ? "duplicate"
            : hasCompany && new Date(target.publishedAt) > new Date(issue.publishDate)
              ? "follow-up"
              : "related";
        if (!best || score > best.score) {
          best = {
            issueNo: issue.issueNo,
            publishDate: issue.publishDate,
            articleId: d.articleId,
            articleTitle: d.title,
            sharedKeywords: shared,
            score: Math.round(score * 100) / 100,
            kind,
            label: relationLabel(issue, shared, kind),
          };
        }
      }
      if (best) relations.push(best);
    }
    relations.sort((a, b) => b.score - a.score);
    return { articleId: target.id, relations: relations.slice(0, 3) };
  });
}

export function relationLabel(issue: Pick<NewsletterIssue, "issueNo" | "publishDate">, shared: string[], kind: RelationKind) {
  const topic = shared.find((k) => KIND.get(k) !== "tech") ?? shared[0];
  const head = `${issueLabel(issue.issueNo)}(${shortDate(issue.publishDate)})`;
  if (kind === "duplicate") return `${head}에서 이미 다룬 기사와 중복 가능성`;
  if (kind === "follow-up") return `${head}에서 다룬 ${topic} 솔루션의 후속 기사`;
  return topic ? `${head}에서 다룬 ${topic} 주제와 연관` : `${head} 주제와 유사`;
}

/** 키워드별 과거 등장 이력 (MI 코너 생성 컨텍스트) */
export function keywordTimeline(keywords: string[], issues: NewsletterIssue[], allArticles: Article[]) {
  const byId = new Map(allArticles.map((a) => [a.id, a]));
  return keywords
    .map((k) => ({
      keyword: k,
      appearances: issues
        .filter(
          (i) =>
            i.keywords.includes(k) ||
            i.articleIds.some((id) => byId.get(id)?.keywords.includes(k)),
        )
        .sort((a, b) => a.issueNo - b.issueNo)
        .map((i) => ({ issueNo: i.issueNo, publishDate: i.publishDate, concept: i.concept })),
    }))
    .filter((t) => t.appearances.length > 0);
}
