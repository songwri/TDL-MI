import { fail, ok } from "@/lib/api";
import { renderAll } from "@/lib/newsletter/render";
import { NewsletterSchema } from "@/lib/newsletter/schema";
import { getArticles } from "@/lib/store";

/** POST /api/newsletter/render — 편집된 콘텐츠를 다시 HTML 로 렌더링 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { content: unknown; issueNo: number; publishDate: string; articleIds: string[] };
    const parsed = NewsletterSchema.safeParse(body.content);
    if (!parsed.success) return fail(new Error(`콘텐츠 형식 오류: ${parsed.error.message}`), 400);
    const articles = await getArticles(body.articleIds ?? []);
    return ok(renderAll(parsed.data, body.issueNo, body.publishDate, articles));
  } catch (e) {
    return fail(e);
  }
}
