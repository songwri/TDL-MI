import { fail, ok } from "@/lib/api";
import { renderAll } from "@/lib/newsletter/render";
import { synthesizeNewsletter } from "@/lib/newsletter/synthesizer";
import { getAllArticles, getArticles, listIssues } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  issueNo: number;
  publishDate: string;
  concept: string;
  articleIds: string[];
  mainArticleId?: string;
  churuArticleId?: string;
}

/** POST /api/newsletter/generate — 선택 기사 + 기획 콘셉트 → 구조화 콘텐츠 + 아웃룩 HTML */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body.articleIds?.length) return fail(new Error("기사를 1개 이상 선택하세요."), 400);
    if (body.articleIds.length > 6) return fail(new Error("기사는 최대 6개까지 선택할 수 있습니다."), 400);
    if (!body.concept?.trim()) return fail(new Error("이번 입고 기획 콘셉트를 입력하세요."), 400);

    const [articles, issues, all] = await Promise.all([getArticles(body.articleIds), listIssues(), getAllArticles()]);
    const result = await synthesizeNewsletter({ ...body, articles, issues, allArticles: all });
    return ok({ ...result, ...renderAll(result.content, body.issueNo, body.publishDate, articles) });
  } catch (e) {
    return fail(e);
  }
}
