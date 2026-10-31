import { fail, ok } from "@/lib/api";
import { buildViewer } from "@/lib/newsletter/render";
import { getArticles, getIssue } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ issueNo: string }> }) {
  try {
    const issue = await getIssue(Number((await params).issueNo));
    if (!issue) return fail(new Error("해당 호수를 찾을 수 없습니다."), 404);
    const articles = await getArticles(issue.articleIds);
    return ok({
      issue,
      articles: articles.map((a) => ({ ...a, content: undefined })),
      viewer: issue.content ? buildViewer(issue.issueNo, issue.publishDate, articles) : null,
    });
  } catch (e) {
    return fail(e);
  }
}
