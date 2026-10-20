import { fail, ok } from "@/lib/api";
import { getArticles, getIssue } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ issueNo: string }> }) {
  try {
    const issue = await getIssue(Number((await params).issueNo));
    if (!issue) return fail(new Error("해당 차수를 찾을 수 없습니다."), 404);
    const articles = await getArticles(issue.articleIds);
    return ok({ issue, articles: articles.map((a) => ({ ...a, content: undefined })) });
  } catch (e) {
    return fail(e);
  }
}
