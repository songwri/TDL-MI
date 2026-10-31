"use client";

import type { ReportContent } from "@/lib/types";

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="font-bold text-brand">{title}</h4>
      {children}
    </section>
  );
}

/** 생성된 리포트를 섹션별로 수정하는 편집기 (통계·인포그래픽은 서버 계산값이라 편집하지 않음) */
export function ContentEditor({ value, onChange }: { value: ReportContent; onChange: (c: ReportContent) => void }) {
  const c = value;
  const set = (patch: Partial<ReportContent>) => onChange({ ...c, ...patch });
  const th = (i: number, patch: Partial<ReportContent["themes"][number]>) => set({ themes: c.themes.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const tr = (patch: Partial<ReportContent["trend"]>) => set({ trend: { ...c.trend, ...patch } });

  return (
    <div className="grid gap-6 text-sm lg:grid-cols-2">
      <div className="space-y-6">
        <Section title="제목과 핵심 요약">
          <Field label="리포트 제목 (메일 제목)" value={c.headline} onChange={(v) => set({ headline: v })} />
          <Field label="이번 호 한 줄 결론" hint="맨 위 강조 상자" value={c.keyTakeaway ?? ""} onChange={(v) => set({ keyTakeaway: v })} />
          <Field label="핵심 요약" hint="한 줄에 하나 · **핵심 구절**은 형광펜 표시" value={c.executiveSummary.join("\n")} rows={6} onChange={(v) => set({ executiveSummary: lines(v) })} />
        </Section>
        <Section title="추세 분석">
          <Field label="해석" value={c.trend.overview} rows={3} onChange={(v) => tr({ overview: v })} />
          <Field label="관찰" hint="한 줄에 하나" value={c.trend.notes.join("\n")} rows={3} onChange={(v) => tr({ notes: lines(v) })} />
        </Section>
        <Section title="제언 및 향후 과제">
          <Field label="제언" hint="한 줄에 하나" value={c.recommendations.join("\n")} rows={4} onChange={(v) => set({ recommendations: lines(v) })} />
          <Field label="다음 호까지 확인할 사항" hint="한 줄에 하나" value={c.watchList.join("\n")} rows={3} onChange={(v) => set({ watchList: lines(v) })} />
          <Field label="핵심 키워드" hint="쉼표로 구분" value={c.keywords.join(", ")} onChange={(v) => set({ keywords: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
        </Section>
      </div>
      <div className="space-y-6">
        {c.themes.map((t, i) => (
          <Section key={i} title={`핵심 인사이트 ${i + 1}`}>
            <Field label="제목" value={t.title} onChange={(v) => th(i, { title: v })} />
            <Field label="핵심 한 줄" hint="제목 아래 강조" value={t.takeaway ?? ""} onChange={(v) => th(i, { takeaway: v })} />
            <Field label="리드" value={t.lead} rows={2} onChange={(v) => th(i, { lead: v })} />
            <Field label="본문" hint="문단은 빈 줄로 구분 · **핵심 구절**" value={t.body.join("\n\n")} rows={8} onChange={(v) => th(i, { body: paras(v) })} />
            <Field label="핵심 인사이트" hint="한 줄에 하나" value={t.insights.join("\n")} rows={3} onChange={(v) => th(i, { insights: lines(v) })} />
            <Field label="시사점" hint="한 줄에 하나" value={t.implications.join("\n")} rows={3} onChange={(v) => th(i, { implications: lines(v) })} />
          </Section>
        ))}
      </div>
    </div>
  );
}
