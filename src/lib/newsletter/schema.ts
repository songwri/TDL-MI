import { z } from "zod";

export const NewsletterSchema = z.object({
  headline: z.string().describe("메일 제목으로 쓸 한 줄 헤드라인 (40자 이내)"),
  conceptBriefing: z.string().describe("이번 호 기획 콘셉트 한 줄 브리핑"),
  editorNote: z.string().describe("로지봇 페르소나의 2~3문장 오프닝 인사 및 이번 호 안내"),
  deepDive: z.object({
    articleId: z.string(),
    title: z.string().describe("딥다이브 섹션 제목 (원문 제목을 한국어로 재구성)"),
    source: z.string(),
    url: z.string(),
    summary: z.string().describe("기사 핵심 요약 2~3문장"),
    analysis: z.array(z.string()).describe("심층 분석 문단 2~4개"),
    keyPoints: z.array(z.string()).describe("핵심 포인트 3~5개 (수치/사실 중심)"),
    implications: z.array(z.string()).describe("사내 도입 시사점 2~4개 (실행 가능한 관점)"),
  }),
  briefs: z
    .array(
      z.object({
        articleId: z.string(),
        title: z.string(),
        source: z.string(),
        url: z.string(),
        summary: z.string().describe("2~3문장 요약"),
        keyPoint: z.string().describe("한 줄 핵심 포인트"),
      }),
    )
    .describe("테크 & 인더스트리 브리프: 딥다이브 외 나머지 선택 기사 전부"),
  marketIntelligence: z.object({
    overview: z.string().describe("과거 발행 주제와 연결한 기술 흐름 점검 2~3문장"),
    connections: z
      .array(
        z.object({
          pastIssueLabel: z.string().describe("예: '2호(05/10)'. 과거 이력이 없으면 '신규 관측'"),
          topic: z.string(),
          insight: z.string(),
        }),
      )
      .describe("과거 호수와의 연결 1~4개"),
    watchList: z.array(z.string()).describe("다음 호까지 지켜볼 관전 포인트 2~3개"),
  }),
  closingTip: z.string().describe("로지봇의 마무리 한마디 (1~2문장)"),
  keywords: z.array(z.string()).describe("이번 호 핵심 키워드 3~7개"),
});

export type NewsletterDraft = z.infer<typeof NewsletterSchema>;
