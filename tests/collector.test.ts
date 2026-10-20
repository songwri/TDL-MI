import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { toArticle } from "@/lib/collector";
import { extractArticlePage, extractListLinks, parseFeed } from "@/lib/collector/parse";
import { articleIdFromUrl, normalizeUrl } from "@/lib/utils/text";

const fx = (n: string) => fs.readFileSync(path.join(__dirname, "fixtures", n), "utf8");

describe("URL 정규화", () => {
  it("트래킹 파라미터·www·끝 슬래시를 제거하여 같은 기사로 판정", () => {
    expect(normalizeUrl("https://www.a.com/x/?utm_source=rss&id=1#top")).toBe("a.com/x?id=1");
    expect(articleIdFromUrl("http://a.com/x?id=1&utm_medium=x")).toBe(articleIdFromUrl("https://www.a.com/x/?id=1"));
  });
});

describe("RSS 파서", () => {
  it("ndsoft CMS 피드에서 제목/링크/발행일/썸네일/요약 추출", async () => {
    const items = await parseFeed(fx("ndsoft-rss.xml"));
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("CJ대한통운, 곤지암 메가허브에 AMR 200대 추가 투입");
    expect(items[0].publishedAt).toBe("2026-10-19T00:00:00.000Z");
    expect(items[0].thumbnail).toBe("https://cdn.klnews.co.kr/thumb/100001.jpg");
    expect(items[0].summary).toContain("자율주행 로봇(AMR) 200대");
  });

  it("Google News 제목에서 매체명을 분리", async () => {
    const [it0] = await parseFeed(fx("gnews-rss.xml"), { googleNews: true });
    expect(it0.title).toBe("AutoStore unveils new port at LogiMAT 2026");
    expect(it0.publisher).toBe("Logistics Business");
  });

  it("기사 → Article 변환 시 카테고리·키워드 부여", async () => {
    const [item] = await parseFeed(fx("ndsoft-rss.xml"));
    const a = toArticle(item, { name: "물류신문", region: "KR" });
    expect(a.category).toBe("AMR/AGV");
    expect(a.keywords).toEqual(expect.arrayContaining(["CJ대한통운", "AMR"]));
    expect(a.id).toMatch(/^A[0-9a-f]{10}$/);
  });
});

describe("HTML 스크래퍼", () => {
  it("목록 페이지에서 기사 링크만 추출(중복·짧은 텍스트 제외)", () => {
    const links = extractListLinks(fx("list.html"), "https://www.robotics247.com/topic/x", "/article/");
    expect(links.map((l) => l.link)).toEqual([
      "https://www.robotics247.com/article/symbotic_expands_walmart_deal",
      "https://www.robotics247.com/article/locus_robotics_raises_new_round",
    ]);
  });

  it("기사 페이지에서 메타·본문 추출", () => {
    const p = extractArticlePage(fx("article.html"), "https://www.robotics247.com/article/x");
    expect(p.title).toBe("Symbotic expands Walmart automation deal");
    expect(p.publishedAt).toBe("2026-10-12T14:00:00.000Z");
    expect(p.image).toBe("https://www.robotics247.com/images/symbotic.jpg");
    expect(p.content).toContain("12 additional Walmart");
    expect(p.content).not.toContain("var ad");
    expect(p.content).not.toContain("menu");
  });
});
