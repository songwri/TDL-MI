import { describe, expect, it } from "vitest";
import { analyzeArticles, keywordTimeline } from "@/lib/mi";
import { classify, extractKeywords, isRelevant } from "@/lib/mi/matcher";
import type { Article, NewsletterIssue } from "@/lib/types";

const art = (p: Partial<Article> & Pick<Article, "id" | "title">): Article => ({
  collectedAt: "2026-10-01T00:00:00Z",
  publishedAt: "2026-10-01T00:00:00Z",
  source: "test",
  region: "GLOBAL",
  link: `https://ex.com/${p.id}`,
  summary: "",
  category: "기타",
  keywords: extractKeywords(`${p.title} ${p.summary ?? ""}`),
  selected: false,
  ...p,
});

describe("matcher", () => {
  it("짧은 영문 약어는 단어 경계로만 매칭", () => {
    expect(extractKeywords("Toyota Camry sales")).not.toContain("AMR");
    expect(extractKeywords("New AMR fleet")).toContain("AMR");
    expect(extractKeywords("Amazon Robotics Proteus 확대")).toEqual(["Amazon Robotics"]);
  });
  it("카테고리 분류", () => {
    expect(classify("오토스토어 큐브 스토리지 도입", "KR")).toBe("소팅/보관설비");
    expect(classify("휴머노이드 피킹 로봇 공개", "KR")).toBe("로봇 피킹/매니퓰레이션");
    expect(classify("Port volumes rise", "GLOBAL")).toBe("글로벌 트렌드");
    expect(classify("항만 물동량 증가", "KR")).toBe("기타");
  });
  it("관련성 필터", () => {
    expect(isRelevant("Retailer opens new fulfillment center")).toBe(true);
    expect(isRelevant("수술 로봇 국내 허가")).toBe(true);
    expect(isRelevant("Quarterly earnings beat expectations")).toBe(false);
  });
});

describe("MI 이력 매칭", () => {
  const past = art({ id: "P1", title: "AutoStore 큐브형 자동창고, 국내 첫 도입", summary: "AutoStore 시스템이 국내 풀필먼트센터에 도입됐다", publishedAt: "2026-05-01T00:00:00Z" });
  const issues: NewsletterIssue[] = [
    { issueNo: 2, publishDate: "2026-05-10", concept: "큐브형 AS/RS", articleIds: ["P1"], html: "", keywords: ["AutoStore"], createdAt: "" },
  ];

  it("과거 호에서 다룬 솔루션의 후속 기사로 태깅", () => {
    const now = art({ id: "N1", title: "AutoStore, 신규 피킹 포트 공개", summary: "AutoStore가 새로운 포트를 선보였다", publishedAt: "2026-10-10T00:00:00Z" });
    const [res] = analyzeArticles([now], issues, [past, now], { now: new Date("2026-10-20") });
    expect(res.relations[0].issueNo).toBe(2);
    expect(res.relations[0].kind).toBe("follow-up");
    expect(res.relations[0].label).toBe("제2호(05/10)에서 다룬 AutoStore 솔루션의 후속 기사");
  });

  it("동일 URL 은 중복 경고", () => {
    const dup = { ...past, id: "X", publishedAt: "2026-10-10T00:00:00Z" };
    const [res] = analyzeArticles([dup], issues, [past], { now: new Date("2026-10-20") });
    expect(res.relations[0].kind).toBe("duplicate");
  });

  it("무관한 기사는 태그 없음, 조회 기간 밖 호수는 제외", () => {
    const other = art({ id: "N2", title: "Port volumes rise in Q3", publishedAt: "2026-10-10T00:00:00Z" });
    expect(analyzeArticles([other], issues, [past], { now: new Date("2026-10-20") })[0].relations).toHaveLength(0);
    const later = art({ id: "N3", title: "AutoStore 후속", publishedAt: "2027-06-10T00:00:00Z" });
    expect(analyzeArticles([later], issues, [past], { now: new Date("2027-06-20"), lookbackDays: 180 })[0].relations).toHaveLength(0);
  });

  it("키워드 타임라인", () => {
    const tl = keywordTimeline(["AutoStore", "AMR"], issues, [past]);
    expect(tl).toEqual([{ keyword: "AutoStore", appearances: [{ issueNo: 2, publishDate: "2026-05-10", concept: "큐브형 AS/RS" }] }]);
  });
});
