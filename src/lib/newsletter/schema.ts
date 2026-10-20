import { z } from "zod";

export const NewsletterSchema = z.object({
  headline: z.string().describe("메일 제목. 궁금증을 부르는 한 줄 (35자 이내)"),
  intro: z.string().describe("레포냥의 오프닝. 이번 입고에서 무엇을 정리했는지 2~4문장"),
  quickNews: z
    .array(
      z.object({
        articleId: z.string(),
        tag: z.string().describe("짧은 분야 태그. 예: 'AMR', '풀필먼트', '글로벌'"),
        title: z.string().describe("기사 핵심을 담은 한 줄 제목 (물음표·따옴표 활용 가능)"),
        emoji: z.string().describe("제목 끝에 붙일 이모지 1개"),
        body: z.string().describe("2~3문장 요약. 왜 중요한지까지"),
        source: z.string(),
        url: z.string(),
      }),
    )
    .describe("1분 냥스: quickNews 역할 기사 전부, 제공 순서대로"),
  mainReport: z.object({
    articleId: z.string(),
    kicker: z.string().describe("제목 위 작은 회색 문구. 예: 'AutoStore 신형 포트가 바꿀 피킹 현장'"),
    title: z.string().describe("메인 리포트 제목"),
    source: z.string(),
    url: z.string(),
    paragraphs: z.array(z.string()).describe("본문 문단 3~5개. 배경 → 무슨 일 → 왜 중요한가 흐름"),
    keyPoints: z.array(z.string()).describe("핵심만 쏙: 수치·사실 중심 3~4개"),
    forUs: z.array(z.string()).describe("우리 사업부엔?: 독자 사업부의 물류센터 운영·자동화 검토에 주는 시사점 2~3개"),
  }),
  churuStation: z.object({
    articleId: z.string().describe("츄르 기사 articleId. 지정 기사가 없으면 빈 문자열"),
    title: z.string().describe("'띵동!'처럼 가볍게 시작하는 한 줄 제목"),
    body: z.string().describe("따끈한 소식 한 조각 2~3문장"),
    question: z.string().describe("구독자에게 던지는 질문 1개 (답장을 부르는 구체적인 질문)"),
    source: z.string(),
    url: z.string(),
  }),
  tailNews: z.object({
    intro: z.string().describe("이번 입고 소식이 지난 입고와 어떻게 이어지는지 1~2문장"),
    items: z
      .array(
        z.object({
          pastIssueLabel: z.string().describe("예: '3차 · 09/08'. 이력이 없으면 '첫 입고'"),
          topic: z.string(),
          story: z.string().describe("그때와 지금 무엇이 달라졌는지 1~2문장"),
        }),
      )
      .describe("1~3개"),
    watchList: z.array(z.string()).describe("다음 입고까지 지켜볼 것 2개"),
  }),
  closing: z.string().describe("레포냥의 마무리 인사 1~2문장. 다음 입고 예정일 포함"),
  keywords: z.array(z.string()).describe("이번 입고 핵심 키워드 3~6개"),
});

export type NewsletterDraft = z.infer<typeof NewsletterSchema>;
