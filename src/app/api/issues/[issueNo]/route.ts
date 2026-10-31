import { fail, ok } from "@/lib/api";
import { renderAll } from "@/lib/newsletter/render";
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
      // 구조화 데이터가 있으면 최신 템플릿으로 다시 그림 (인포그래픽 이미지·표 버전 포함)
      render: issue.content ? renderAll(issue.content, issue.issueNo, issue.publishDate, articles) : null,
    });
  } catch (e) {
    return fail(e);
  }
}
