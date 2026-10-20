import Link from "next/link";
import { getAllArticles, listIssues } from "@/lib/store";
import { shortDate } from "@/lib/utils/text";
import { SheetsControls } from "@/components/SheetsControls";

export const dynamic = "force-dynamic";

/** Market Intelligence 아카이브: 발행 이력 + 키워드 × 호수 추적 매트릭스 */
export default async function IssuesPage() {
  const [issues, articles] = await Promise.all([listIssues(), getAllArticles()]);
  const byId = new Map(articles.map((a) => [a.id, a]));
  const asc = [...issues].sort((a, b) => a.issueNo - b.issueNo);

  const kwIssues = new Map<string, Set<number>>();
  for (const i of asc) {
    const kws = new Set([...i.keywords, ...i.articleIds.flatMap((id) => byId.get(id)?.keywords ?? [])]);
    for (const k of kws) {
      if (!kwIssues.has(k)) kwIssues.set(k, new Set());
      kwIssues.get(k)!.add(i.issueNo);
    }
  }
  const topKeywords = [...kwIssues.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 25);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-brand">🧭 Market Intelligence 아카이브</h1>
        <span className="text-sm text-slate-500">총 {issues.length}개 호 발행</span>
        <div className="ml-auto"><SheetsControls /></div>
      </div>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">호수</th>
              <th className="px-3 py-2">발행일</th>
              <th className="px-3 py-2">헤드라인 / 메인 콘셉트</th>
              <th className="px-3 py-2">선정 기사</th>
              <th className="px-3 py-2">핵심 키워드</th>
            </tr>
          </thead>
          <tbody>
            {issues.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">아직 발행 이력이 없습니다.</td></tr>
            )}
            {issues.map((i) => (
              <tr key={i.issueNo} className="border-t border-slate-100 align-top hover:bg-slate-50">
                <td className="px-3 py-2 font-bold text-brand">
                  <Link href={`/issues/${i.issueNo}`} className="hover:underline">{i.issueNo}호</Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{i.publishDate}</td>
                <td className="px-3 py-2">
                  <Link href={`/issues/${i.issueNo}`} className="font-medium text-slate-900 hover:text-brand hover:underline">{i.headline ?? "(제목 없음)"}</Link>
                  <div className="line-clamp-2 text-xs text-slate-500">{i.concept}</div>
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {i.articleIds.map((id) => (
                    <div key={id} className="line-clamp-1">· {byId.get(id)?.title ?? id}</div>
                  ))}
                </td>
                <td className="px-3 py-2 text-xs text-teal-700">{i.keywords.map((k) => `#${k}`).join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {topKeywords.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold text-slate-800">📊 키워드 추적 매트릭스 <span className="text-xs font-normal text-slate-500">(어떤 주제를 언제 다뤘는지)</span></h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left">키워드</th>
                  {asc.map((i) => (
                    <th key={i.issueNo} className="px-2 py-2 font-medium">{i.issueNo}호<div className="font-normal">{shortDate(i.publishDate)}</div></th>
                  ))}
                  <th className="px-3 py-2">횟수</th>
                </tr>
              </thead>
              <tbody>
                {topKeywords.map(([k, set]) => (
                  <tr key={k} className="border-t border-slate-100">
                    <td className="sticky left-0 bg-white px-3 py-1.5 font-medium text-slate-700">{k}</td>
                    {asc.map((i) => (
                      <td key={i.issueNo} className="px-2 py-1.5 text-center">
                        {set.has(i.issueNo) ? <span className="inline-block size-3 rounded-sm bg-accent" title={`${i.issueNo}호`} /> : <span className="inline-block size-3 rounded-sm bg-slate-100" />}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-center text-slate-500">{set.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
