import { fail, ok } from "@/lib/api";
import { renderAll } from "@/lib/newsletter/render";
import { NewsletterSchema } from "@/lib/newsletter/schema";
import { getArticles, listIssues, saveIssue } from "@/lib/store";
import type { NewsletterIssue } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const issues = await listIssues();
    return ok({ issues: issues.map((i) => ({ ...i, html: undefined, content: undefined })) });
  } catch (e) {
    return fail(e);
  }
}

/** POST /api/issues — 발행 확정: Newsletter_Issues 시트에 이력 저장 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      issueNo: number;
      publishDate: string;
      concept: string;
      articleIds: string[];
      content: unknown;
    };
    const parsed = NewsletterSchema.safeParse(body.content);
    if (!parsed.success) return fail(new Error(`콘텐츠 형식 오류: ${parsed.error.message}`), 400);
    if (!Number.isInteger(body.issueNo) || body.issueNo < 1) return fail(new Error("입고 차수가 올바르지 않습니다."), 400);
    const articles = await getArticles(body.articleIds);
    const { html } = renderAll(parsed.data, body.issueNo, body.publishDate, articles);
    const issue: NewsletterIssue = {
      issueNo: body.issueNo,
      publishDate: body.publishDate,
      concept: body.concept,
      articleIds: body.articleIds,
      html,
      keywords: parsed.data.keywords,
      headline: parsed.data.headline,
      content: parsed.data,
      createdAt: new Date().toISOString(),
    };
    const { warning } = await saveIssue(issue);
    return ok({ issueNo: issue.issueNo, warning });
  } catch (e) {
    return fail(e);
  }
}
