import type { NewsletterContent } from "@/lib/types";

export const sampleContent: NewsletterContent = {
  headline: "피지컬 AI, 피킹 현장으로 <들어오다>",
  conceptBriefing: "로봇 피킹 상용화 속도 점검 & 당사 적용 포인트",
  editorNote: "안녕하세요, 로지봇입니다.",
  deepDive: {
    articleId: "A1",
    title: "Symbotic expands Walmart deal",
    source: "Robotics 24/7",
    url: "https://ex.com/a1?x=1&y=2",
    summary: "요약",
    analysis: ["분석 1", "분석 2"],
    keyPoints: ["포인트 1", "포인트 2"],
    implications: ["시사점 1"],
  },
  briefs: [{ articleId: "A2", title: "브리프", source: "물류신문", url: "https://ex.com/a2", summary: "브리프 요약", keyPoint: "핵심" }],
  marketIntelligence: {
    overview: "흐름",
    connections: [{ pastIssueLabel: "2호(05/10)", topic: "AutoStore", insight: "후속" }],
    watchList: ["관전 1"],
  },
  closingTip: "감사합니다.",
  keywords: ["AutoStore", "AMR"],
};
