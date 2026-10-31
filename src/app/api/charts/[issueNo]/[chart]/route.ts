import { svgToPng } from "@/lib/charts/png";
import { verifyChartSig } from "@/lib/charts/sign";
import { chartSvg, type ChartId } from "@/lib/charts/svg";
import { getHandoffContent } from "@/lib/newsletter/handoff";
import { buildViewer } from "@/lib/newsletter/render";
import { getArticles, getIssue } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IDS = new Set<ChartId>(["category", "keywords", "map", "trend", "heatmap"]);

/**
 * GET /api/charts/:issueNo/:chart.png?s=서명
 * 메일 본문의 인포그래픽 이미지. 아웃룩이 비밀번호 없이 받아 갈 수 있어야 하므로 로그인 대신 주소 서명으로 보호한다.
 * 발행된 호가 있으면 그 내용, 없으면 작성 중인 작성본으로 그린다.
 */
export async function GET(req: Request, { params }: { params: Promise<{ issueNo: string; chart: string }> }) {
  const { issueNo: raw, chart: file } = await params;
  const issueNo = Number(raw);
  const chart = file.replace(/\.png$/, "") as ChartId;
  if (!issueNo || !IDS.has(chart)) return new Response("not found", { status: 404 });
  if (!verifyChartSig(issueNo, chart, new URL(req.url).searchParams.get("s"))) return new Response("forbidden", { status: 403 });

  try {
    const issue = await getIssue(issueNo);
    const source = issue?.content ? { content: issue.content, articleIds: issue.articleIds, publishDate: issue.publishDate } : await getHandoffContent(issueNo);
    if (!source?.content) return new Response("not found", { status: 404 });
    const articles = await getArticles(source.articleIds);
    const svg = chartSvg(chart, source.content, buildViewer(issueNo, source.publishDate, articles).articles);
    if (!svg) return new Response("not found", { status: 404 });
    return new Response(new Uint8Array(svgToPng(svg)), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" },
    });
  } catch (e) {
    console.error("[charts]", e);
    return new Response("error", { status: 500 });
  }
}

