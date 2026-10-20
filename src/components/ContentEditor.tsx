"use client";

import { SECTIONS } from "@/config/brand";
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="font-bold text-brand">{title}</h4>
      {children}
    </section>
  );
}

/** 생성된 레터를 섹션별로 수정하는 편집기 */
export function ContentEditor({ value, onChange }: { value: NewsletterContent; onChange: (c: NewsletterContent) => void }) {
  const c = value;
  const set = (patch: Partial<NewsletterContent>) => onChange({ ...c, ...patch });
  const mr = (patch: Partial<NewsletterContent["mainReport"]>) => set({ mainReport: { ...c.mainReport, ...patch } });
  const cs = (patch: Partial<NewsletterContent["churuStation"]>) => set({ churuStation: { ...c.churuStation, ...patch } });
  const tn = (patch: Partial<NewsletterContent["tailNews"]>) => set({ tailNews: { ...c.tailNews, ...patch } });
  const qn = (i: number, patch: Partial<NewsletterContent["quickNews"][number]>) =>
    set({ quickNews: c.quickNews.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  return (
    <div className="grid gap-6 text-sm lg:grid-cols-2">
      <div className="space-y-6">
        <Section title="헤더">
          <Field label="메일 제목" value={c.headline} onChange={(v) => set({ headline: v })} />
          <Field label="오프닝 메시지" value={c.intro} rows={4} onChange={(v) => set({ intro: v })} />
        </Section>
        <Section title={SECTIONS.quickNews.label}>
          {c.quickNews.map((q, i) => (
            <div key={q.articleId || i} className="space-y-2 rounded border border-slate-200 p-2">
              <div className="grid grid-cols-[90px_1fr_60px] gap-2">
                <Field label="태그" value={q.tag} onChange={(v) => qn(i, { tag: v })} />
                <Field label="제목" value={q.title} onChange={(v) => qn(i, { title: v })} />
                <Field label="이모지" value={q.emoji} onChange={(v) => qn(i, { emoji: v })} />
              </div>
              <Field label="요약" value={q.body} rows={3} onChange={(v) => qn(i, { body: v })} />
            </div>
          ))}
        </Section>
        <Section title={SECTIONS.churuStation.label}>
          <Field label="제목" value={c.churuStation.title} onChange={(v) => cs({ title: v })} />
          <Field label="소식 한 조각" value={c.churuStation.body} rows={3} onChange={(v) => cs({ body: v })} />
          <Field label="구독자에게 던지는 질문" value={c.churuStation.question} onChange={(v) => cs({ question: v })} />
        </Section>
      </div>
      <div className="space-y-6">
        <Section title={SECTIONS.mainReport.label}>
          <Field label="작은 머리말" value={c.mainReport.kicker} onChange={(v) => mr({ kicker: v })} />
          <Field label="제목" value={c.mainReport.title} onChange={(v) => mr({ title: v })} />
          <Field label="본문" hint="문단은 빈 줄로 구분" value={c.mainReport.paragraphs.join("\n\n")} rows={9} onChange={(v) => mr({ paragraphs: paras(v) })} />
          <Field label="핵심만 쏙" hint="한 줄에 하나" value={c.mainReport.keyPoints.join("\n")} rows={4} onChange={(v) => mr({ keyPoints: lines(v) })} />
          <Field label="우리 회사엔?" hint="한 줄에 하나" value={c.mainReport.forUs.join("\n")} rows={3} onChange={(v) => mr({ forUs: lines(v) })} />
        </Section>
        <Section title={SECTIONS.tailNews.label}>
          <Field label="도입" value={c.tailNews.intro} rows={2} onChange={(v) => tn({ intro: v })} />
          <Field
            label="지난 호 연결"
            hint="한 줄에 '라벨 | 주제 | 이야기'"
            rows={4}
            value={c.tailNews.items.map((x) => `${x.pastIssueLabel} | ${x.topic} | ${x.story}`).join("\n")}
            onChange={(v) =>
              tn({
                items: lines(v).map((l) => {
                  const [pastIssueLabel = "", topic = "", ...rest] = l.split("|").map((s) => s.trim());
                  return { pastIssueLabel, topic, story: rest.join(" | ") };
                }),
              })
            }
          />
          <Field label="다음 입고까지 지켜볼 것" hint="한 줄에 하나" value={c.tailNews.watchList.join("\n")} rows={2} onChange={(v) => tn({ watchList: lines(v) })} />
        </Section>
        <Section title="마무리">
          <Field label="레포냥의 한마디" value={c.closing} rows={2} onChange={(v) => set({ closing: v })} />
          <Field label="핵심 키워드" hint="쉼표로 구분" value={c.keywords.join(", ")} onChange={(v) => set({ keywords: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
        </Section>
      </div>
    </div>
  );
}
