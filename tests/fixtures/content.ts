import type { NewsletterContent } from "@/lib/types";

export const sampleContent: NewsletterContent = {
  headline: "로봇 팔, 드디어 <피킹 현장>으로?",
  intro: "안녕하세요, 레포냥이에요! 이번 호는 피킹 로봇 이야기예요.",
  quickNews: [{ articleId: "A2", tag: "AMR", title: "CJ대한통운 AMR 200대 추가", emoji: "🤖", body: "요약이에요.", source: "물류신문", url: "https://ex.com/a2" }],
  mainReport: {
    articleId: "A1",
    kicker: "AutoStore 신형 포트",
    title: "AutoStore, 로봇 팔 품은 포트 공개",
    source: "Robotics 24/7",
    url: "https://ex.com/a1?x=1&y=2",
    paragraphs: ["문단 1", "문단 2"],
    keyPoints: ["포인트 1", "포인트 2"],
    forUs: ["시사점 1"],
  },
  churuStation: { articleId: "", title: "띵동! 질문 도착", body: "소식 한 조각", question: "여러분 센터는 어때요?", source: "", url: "" },
  tailNews: {
    intro: "지난 호와 이어져요.",
    items: [{ pastIssueLabel: "1호 · 05/23", topic: "AutoStore", story: "그때는 도입, 지금은 신형" }],
    watchList: ["관전 1"],
  },
  closing: "2주 뒤에 만나요!",
  keywords: ["AutoStore", "AMR"],
};
