import { describe, expect, it } from "vitest";
import { renderEmailHtml, renderFragment, renderPlainText } from "@/lib/email/template";
import { NewsletterSchema } from "@/lib/newsletter/schema";
import { buildFallbackDraft } from "@/lib/newsletter/fallback";
import { issueToRow, rowToIssue, articleToRow, rowToArticle } from "@/lib/store/sheets";
import type { Article } from "@/lib/types";
import { sampleContent } from "./fixtures/content";

const meta = {
  issueNo: 7,
  publishDate: "2026-10-20",
  newsletterName: "REPONYANG",
  tagline: "격주 레터",
  feedbackContact: "물류혁신팀",
  feedbackEmail: "mi@example.com",
  assetBaseUrl: "https://mi.example.com/",
  thumbnails: { A1: "https://ex.com/t.jpg" },
};

describe("아웃룩 호환 템플릿", () => {
  const frag = renderFragment(sampleContent, meta);

  it("클래스/스타일시트/div 없이 테이블 + 인라인 스타일만 사용", () => {
    expect(frag).not.toMatch(/class=/);
    expect(frag).not.toMatch(/<style/);
    expect(frag).not.toMatch(/<div/);
    expect(frag).not.toMatch(/<(ul|ol|li|p)[ >]/);
    expect(frag.startsWith("<table")).toBe(true);
    // 모든 td 는 inline font-family 를 가짐
    const tds = frag.match(/<td[^>]*>/g)!;
    expect(tds.every((t) => t.includes("font-family"))).toBe(true);
  });

  it("슬림 600 프레임 + bgcolor 속성, 텍스트 이스케이프, 캐릭터 절대경로", () => {
    expect(frag).toContain('width="600"');
    expect(frag).toContain('bgcolor="#A72B2B"');
    expect(frag).toContain("2026.10.20. 화요일");
    expect(sampleContent.headline).toContain("<");
    expect(renderEmailHtml(sampleContent, meta)).toContain("&lt;피킹 현장&gt;");
    expect(frag).toContain('src="https://mi.example.com/character/wave.png"');
    expect(frag).toContain("mailto:mi@example.com?subject=");
    expect(frag).toContain('href="https://ex.com/a1?x=1&amp;y=2"');
    expect(frag).toContain('src="https://ex.com/t.jpg"');
  });

  it("섹션 구성", () => {
    const order = ["REPONYANG", "레포냥 레터 제7호", "1분 냥스", "오늘의 메인 리포트", "핵심만 쏙", "우리 회사엔?", "츄르 스테이션", "꼬리 뉴스", "오늘 레터 어땠냥?", "레포냥의 한마디"];
    const idx = order.map((s) => frag.indexOf(s));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    for (const s of order) {
      expect(frag).toContain(s);
    }
  });

  it("전체 문서와 텍스트 버전", () => {
    const html = renderEmailHtml(sampleContent, meta);
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("<!--[if mso]>");
    const text = renderPlainText(sampleContent, meta);
    expect(text).toContain("레포냥 레터 제7호 · 2026.10.20. 화요일");
    expect(text).toContain("[1호 · 05/23] AutoStore: 그때는 도입, 지금은 신형");
  });
});

describe("스키마 & 초안", () => {
  it("기본 초안은 스키마를 만족", () => {
    const a: Article = {
      id: "A1", collectedAt: "", publishedAt: "2026-10-10T00:00:00Z", source: "s", region: "KR", title: "제목", link: "https://x",
      summary: "요약입니다. 두 번째 문장입니다.", category: "기타", keywords: ["AMR"], selected: true,
    };
    const d = buildFallbackDraft({ issueNo: 3, concept: "콘셉트", main: a, quick: [{ ...a, id: "A2" }], churu: { ...a, id: "A3" }, intel: [] });
    expect(NewsletterSchema.safeParse(d).success).toBe(true);
    expect(d.quickNews).toHaveLength(1);
    expect(d.churuStation.articleId).toBe("A3");
  });
});

describe("시트 직렬화", () => {
  it("긴 HTML 은 여러 셀로 분할 후 복원", () => {
    const html = "x".repeat(120_000);
    const row = issueToRow({ issueNo: 3, publishDate: "2026-10-20", concept: "c", articleIds: ["A1", "A2"], html, keywords: ["k"], createdAt: "t" });
    expect(row.every((c) => c.length <= 49_000)).toBe(true);
    const back = rowToIssue(row)!;
    expect(back.html).toBe(html);
    expect(back.articleIds).toEqual(["A1", "A2"]);
  });

  it("기사 행 왕복 + 선정여부", () => {
    const a: Article = {
      id: "A1", collectedAt: "c", publishedAt: "p", source: "s", region: "KR", title: "=t", link: "l", summary: "",
      category: "AMR/AGV", keywords: ["AMR", "쿠팡"], selected: false, publishedInIssue: 5,
    };
    const r = articleToRow(a);
    expect(r[8]).toBe("발행(5호)");
    expect(rowToArticle(r)).toMatchObject({ id: "A1", category: "AMR/AGV", publishedInIssue: 5, selected: false, keywords: ["AMR", "쿠팡"] });
  });
});
