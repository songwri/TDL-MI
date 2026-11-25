import { fail, ok } from "@/lib/api";
import { listIndicators } from "@/lib/indicators";
import { computeInsights } from "@/lib/insights/compute";
import { getAllArticles, getAllArticlesSoft, refresh } from "@/lib/store";
import { listVendors } from "@/lib/vendors";

export const dynamic = "force-dynamic";

/**
 * GET /api/insights?days=180[&fresh=1] — 수집 기사로 계산한 인사이트 + 공개 지표 + 공급사 목록
 * fresh=1 은 화면의 새로고침 버튼: 시트에서 모두 다시 읽는다. 그 밖에는 서버 캐시를 쓴다.
 * 계산 자체는 50ms 안팎이라 캐시하지 않고, 시트 읽기(지표·공급사·기사)만 캐시한다.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const days = Math.min(730, Math.max(30, Number(url.searchParams.get("days")) || 180));
    const fresh = url.searchParams.get("fresh") === "1";
    if (fresh) await refresh(true); // 새로고침 버튼: 기사도 시트에서 무조건 다시 읽음
    const [articles, indicators, vendors] = await Promise.all([fresh ? getAllArticles() : getAllArticlesSoft(), listIndicators({ fresh }), listVendors({ fresh })]);
    return ok(
      { insights: computeInsights(articles, { days }), indicators, vendors, servedAt: new Date().toISOString() },
      // 브라우저도 30초는 그대로 쓰고, 5분까지는 일단 보여 준 뒤 뒤에서 새로 받는다 (본인 브라우저에만 저장)
      { headers: { "Cache-Control": fresh ? "no-store" : "private, max-age=30, stale-while-revalidate=300" } },
    );
  } catch (e) {
    return fail(e);
  }
}
