import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractArticleLinks, findFeedLinks, isArticleUrl, looksLikeFeed, resolveSource } from "@/lib/collector/discover";

const rss = fs.readFileSync(path.join(__dirname, "fixtures", "ndsoft-rss.xml"), "utf8");
const fake = (pages: Record<string, string>) => async (url: string) => {
  if (url in pages) return pages[url];
  throw new Error(`HTTP 404 ${url}`);
};

describe("사이트 주소만으로 수집 방법 찾기", () => {
  it("피드 판별", () => {
    expect(looksLikeFeed(rss)).toBe(true);
    expect(looksLikeFeed('<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">')).toBe(true);
    expect(looksLikeFeed("<!doctype html><html>")).toBe(false);
  });

  it("홈페이지에 표시된 RSS 를 우선 사용", async () => {
    const home = `<html><head><link rel="alternate" type="application/rss+xml" href="/rss/S1N2.xml"></head></html>`;
    expect(findFeedLinks(home, "https://news.example.kr/")).toEqual(["https://news.example.kr/rss/S1N2.xml"]);
    const r = await resolveSource("https://news.example.kr/", fake({ "https://news.example.kr/": home, "https://news.example.kr/rss/S1N2.xml": rss }));
    expect(r).toEqual({ type: "rss", url: "https://news.example.kr/rss/S1N2.xml", via: "link-tag" });
  });

  it("표시가 없으면 국내 언론 CMS 공통 경로를 시도", async () => {
    const r = await resolveSource(
      "https://www.klnews.example/",
      fake({ "https://www.klnews.example/": "<html><body>홈</body></html>", "https://www.klnews.example/rss/allArticle.xml": rss }),
    );
    expect(r).toMatchObject({ type: "rss", url: "https://www.klnews.example/rss/allArticle.xml", via: "common-path" });
  });

  it("피드가 없으면 기사처럼 생긴 링크로 수집", async () => {
    const home = `<html><body>
      <a href="/news/articleView.html?idxno=123456">CJ대한통운, 곤지암 메가허브에 AMR 200대 추가 투입</a>
      <a href="/article/autostore-unveils-next-gen-picking-port">AutoStore unveils next-gen picking port with robotic arm</a>
      <a href="/2026/10/21/agility-robotics-raises-new-round/">Agility Robotics raises new round to scale Digit</a>
      <a href="/tag/robotics">Robotics and automation tag page link</a>
      <a href="/news/articleList.html?sc_section_code=S1N2">섹션 전체 기사 목록 보러 가기 링크</a>
      <a href="https://other.example.com/article/12345678">다른 사이트로 나가는 긴 제목의 기사 링크입니다</a>
      <a href="/news/articleView.html?idxno=123457">짧음</a>
    </body></html>`;
    const links = extractArticleLinks(home, "https://site.example.kr/");
    expect(links.map((l) => l.link)).toEqual([
      "https://site.example.kr/news/articleView.html?idxno=123456",
      "https://site.example.kr/article/autostore-unveils-next-gen-picking-port",
      "https://site.example.kr/2026/10/21/agility-robotics-raises-new-round/",
    ]);
    const r = await resolveSource("https://site.example.kr/", fake({ "https://site.example.kr/": home }));
    expect(r).toEqual({ type: "html", url: "https://site.example.kr/", via: "heuristic", sampleLinks: 3 });
  });

  it("자바스크립트로만 그려지는 빈 페이지는 이유와 함께 실패", async () => {
    await expect(resolveSource("https://spa.example/", fake({ "https://spa.example/": '<div id="root"></div>' }))).rejects.toThrow(/자바스크립트/);
  });

  it("기사 주소 판별", () => {
    expect(isArticleUrl("https://www.irobotnews.com/news/articleView.html?idxno=40001", "irobotnews.com")).toBe(true);
    expect(isArticleUrl("https://www.supplychaindive.com/news/walmart-automation-symbotic/700001/", "www.supplychaindive.com")).toBe(true);
    expect(isArticleUrl("https://www.mmh.com/topic/category/automation", "mmh.com")).toBe(false);
  });
});
