import { z } from "zod";

/** Claude 가 작성하는 부분 (통계는 서버가 계산해 붙이므로 포함하지 않는다) */
export const ReportSchema = z.object({
  headline: z.string().describe("리포트 제목 겸 메일 제목. 이번 호의 핵심 메시지를 담은 한 줄 (45자 이내)"),
  executiveSummary: z.array(z.string()).describe("핵심 요약 3~5개. 각 1문장, 결론 먼저"),
  themes: z
    .array(
      z.object({
        title: z.string().describe("주장이 담긴 테마 제목"),
        lead: z.string().describe("리드 2~3문장"),
        body: z.array(z.string()).describe("본문 2~3문단. 배경 → 무슨 일 → 의미"),
        insights: z.array(z.string()).describe("핵심 인사이트 2~3개. 근거(수치·사실) 포함"),
        implications: z.array(z.string()).describe("독자 사업부 관점의 시사점 1~3개"),
        sourceArticleIds: z.array(z.string()).describe("근거 기사 articleId. 여러 건 가능, 제공된 ID만"),
      }),
    )
    .describe("선정 기사를 공통 주제로 묶은 테마 2~4개"),
  trend: z.object({
    overview: z.string().describe("지난 호 대비 추세 해석 2~3문장. 제공된 통계만 인용"),
    notes: z.array(z.string()).describe("추세 관찰 2~3개"),
  }),
  recommendations: z.array(z.string()).describe("제언 2~4개. 검토·확인할 대상이 분명한 실행안"),
  watchList: z.array(z.string()).describe("다음 호까지 확인할 사항 2~3개"),
  keywords: z.array(z.string()).describe("이번 호 핵심 키워드 3~6개"),
});

const Counts = z.array(z.object({ label: z.string(), counts: z.array(z.number()) }));

/** 저장·렌더링용 (서버가 계산한 통계 포함) */
export const StoredReportSchema = ReportSchema.extend({
  stats: z
    .object({
      total: z.number(),
      byCategory: z.array(z.object({ label: z.string(), count: z.number() })),
      byRegion: z.array(z.object({ label: z.string(), count: z.number() })),
      topKeywords: z.array(z.object({ label: z.string(), count: z.number() })),
      repeat: z.object({ fresh: z.number(), followUp: z.number(), duplicate: z.number() }),
      trend: z.object({
        issues: z.array(z.object({ no: z.number(), date: z.string(), current: z.boolean() })),
        category: Counts,
        keywords: Counts,
      }),
    })
    .optional(),
});

export type ReportDraftInput = z.infer<typeof ReportSchema>;
