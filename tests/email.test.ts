import { describe, expect, it } from "vitest";
import { renderEmailHtml, renderFragment, renderPlainText } from "@/lib/email/template";
import { NewsletterSchema } from "@/lib/newsletter/schema";
import { buildFallbackDraft } from "@/lib/newsletter/fallback";
import { issueToRow, rowToIssue, articleToRow, rowToArticle } from "@/lib/store/sheets";
import type { Article } from "@/lib/types";
import { sampleContent } from "./fixtures/content";

const meta = { issueNo: 7, publishDate: "2026-10-20", newsletterName: "TDL MI", feedbackContact: "물류혁신팀", thumbnails: { A1: "https://ex.com/t.jpg" } };

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

  it("고정 폭 640 + bgcolor 속성, 텍스트 이스케이프", () => {
    expect(frag).toContain('width="640"');
    expect(frag).toContain('bgcolor="#0B3D91"');
    expect(frag).toContain("&lt;들어오다&gt;");
    expect(frag).toContain('href="https://ex.com/a1?x=1&amp;y=2"');
    expect(frag).toContain('src="https://ex.com/t.jpg"');
  });

  it("섹션 구성", () => {
    for (const s of ["No.7", "이번 호 기획 콘셉트", "메인 딥다이브", "사내 도입 시사점", "테크 &amp; 인더스트리 브리프", "Market Intelligence 코너", "피드백 안내"]) {
      expect(frag).toContain(s);
    }
  });

  it("전체 문서와 텍스트 버전", () => {
    const html = renderEmailHtml(sampleContent, meta);
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("<!--[if mso]>");
    const text = renderPlainText(sampleContent, meta);
    expect(text).toContain("TDL MI No.7 (2026.10.20)");
    expect(text).toContain("[2호(05/10)] AutoStore: 후속");
  });
});

describe("스키마 & 초안", () => {
  it("기본 초안은 스키마를 만족", () => {
    const a: Article = {
      id: "A1", collectedAt: "", publishedAt: "2026-10-10T00:00:00Z", source: "s", region: "KR", title: "제목", link: "https://x",
      summary: "요약입니다. 두 번째 문장입니다.", category: "기타", keywords: ["AMR"], selected: true,
    };
    const d = buildFallbackDraft({ issueNo: 3, concept: "콘셉트", main: a, briefs: [{ ...a, id: "A2" }], intel: [] });
    expect(NewsletterSchema.safeParse(d).success).toBe(true);
    expect(d.briefs).toHaveLength(1);
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
