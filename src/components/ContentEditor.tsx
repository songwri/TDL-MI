"use client";

import type { NewsletterContent } from "@/lib/types";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const paras = (s: string) => s.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);

function Field({ label, value, onChange, rows = 1, hint }: { label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-600">
        {label} {hint && <span className="font-normal text-slate-400">({hint})</span>}
      </span>
      {rows === 1 ? (
        <input className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <textarea className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm leading-relaxed" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

/** 생성된 콘텐츠를 섹션별로 수정하는 편집기 */
export function ContentEditor({ value, onChange }: { value: NewsletterContent; onChange: (c: NewsletterContent) => void }) {
  const c = value;
  const set = (patch: Partial<NewsletterContent>) => onChange({ ...c, ...patch });
  const dd = (patch: Partial<NewsletterContent["deepDive"]>) => set({ deepDive: { ...c.deepDive, ...patch } });
  const mi = (patch: Partial<NewsletterContent["marketIntelligence"]>) => set({ marketIntelligence: { ...c.marketIntelligence, ...patch } });

  return (
    <div className="space-y-5 text-sm">
      <section className="space-y-2">
        <h4 className="font-bold text-brand">헤더</h4>
        <Field label="헤드라인 (메일 제목)" value={c.headline} onChange={(v) => set({ headline: v })} />
        <Field label="기획 콘셉트 한 줄 브리핑" value={c.conceptBriefing} onChange={(v) => set({ conceptBriefing: v })} />
        <Field label="로지봇 인사" value={c.editorNote} rows={3} onChange={(v) => set({ editorNote: v })} />
      </section>
      <section className="space-y-2">
        <h4 className="font-bold text-brand">🔍 메인 딥다이브</h4>
        <Field label="제목" value={c.deepDive.title} onChange={(v) => dd({ title: v })} />
        <Field label="요약" value={c.deepDive.summary} rows={3} onChange={(v) => dd({ summary: v })} />
        <Field label="심층 분석" hint="문단은 빈 줄로 구분" value={c.deepDive.analysis.join("\n\n")} rows={8} onChange={(v) => dd({ analysis: paras(v) })} />
        <Field label="핵심 포인트" hint="한 줄에 하나" value={c.deepDive.keyPoints.join("\n")} rows={4} onChange={(v) => dd({ keyPoints: lines(v) })} />
        <Field label="사내 도입 시사점" hint="한 줄에 하나" value={c.deepDive.implications.join("\n")} rows={4} onChange={(v) => dd({ implications: lines(v) })} />
      </section>
      <section className="space-y-3">
        <h4 className="font-bold text-brand">📰 테크 & 인더스트리 브리프</h4>
        {c.briefs.map((b, i) => (
          <div key={b.articleId} className="space-y-2 rounded border border-slate-200 p-2">
            <Field label={`${i + 1}. 제목`} value={b.title} onChange={(v) => set({ briefs: c.briefs.map((x, j) => (j === i ? { ...x, title: v } : x)) })} />
            <Field label="요약" value={b.summary} rows={3} onChange={(v) => set({ briefs: c.briefs.map((x, j) => (j === i ? { ...x, summary: v } : x)) })} />
            <Field label="핵심 포인트" value={b.keyPoint} onChange={(v) => set({ briefs: c.briefs.map((x, j) => (j === i ? { ...x, keyPoint: v } : x)) })} />
          </div>
        ))}
      </section>
      <section className="space-y-2">
        <h4 className="font-bold text-brand">🧭 Market Intelligence 코너</h4>
        <Field label="흐름 점검" value={c.marketIntelligence.overview} rows={3} onChange={(v) => mi({ overview: v })} />
        <Field
          label="과거 호 연결"
          hint="한 줄에 '라벨 | 주제 | 인사이트'"
          rows={4}
          value={c.marketIntelligence.connections.map((x) => `${x.pastIssueLabel} | ${x.topic} | ${x.insight}`).join("\n")}
          onChange={(v) =>
            mi({
              connections: lines(v).map((l) => {
                const [pastIssueLabel = "", topic = "", ...rest] = l.split("|").map((s) => s.trim());
                return { pastIssueLabel, topic, insight: rest.join(" | ") };
              }),
            })
          }
        />
        <Field label="관전 포인트" hint="한 줄에 하나" value={c.marketIntelligence.watchList.join("\n")} rows={3} onChange={(v) => mi({ watchList: lines(v) })} />
      </section>
      <section className="space-y-2">
        <h4 className="font-bold text-brand">푸터</h4>
        <Field label="마무리 한마디" value={c.closingTip} rows={2} onChange={(v) => set({ closingTip: v })} />
        <Field label="핵심 키워드" hint="쉼표로 구분" value={c.keywords.join(", ")} onChange={(v) => set({ keywords: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
      </section>
    </div>
  );
}
