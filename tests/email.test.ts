import { describe, expect, it } from "vitest";
import { hbarChart, heatmap, mix, stackedBar, trendStack } from "@/lib/email/charts";
import { renderEmailHtml, renderFragment, renderPlainText } from "@/lib/email/template";
import { buildFallbackDraft } from "@/lib/newsletter/fallback";
import { ReportSchema, StoredReportSchema } from "@/lib/newsletter/schema";
import { articleToRow, issueToRow, rowToArticle, rowToIssue } from "@/lib/store/sheets";
import type { Article } from "@/lib/types";
import { sampleArticles, sampleContent } from "./fixtures/content";

const meta = {
  issueNo: 4,
  publishDate: "2026-10-27",
  newsletterName: "TDL Trend",
  tagline: "물류·로봇 Market Intelligence",
  feedbackContact: "테크이노베이션팀",
  feedbackEmail: "tdl@example.com",
  audience: "CL사업부",
  articles: sampleArticles,
};

describe("비즈니스 톤 리포트 템플릿 (아웃룩 호환)", () => {
  const frag = renderFragment(sampleContent, meta);

  it("이미지·클래스·스타일시트·div 없이 표와 인라인 스타일만 사용", () => {
    expect(frag).not.toMatch(/<img/i);
    expect(frag).not.toMatch(/class=/);
    expect(frag).not.toMatch(/<style/);
    expect(frag).not.toMatch(/<(div|ul|ol|li|p|svg|canvas|script)[ >]/);
    expect(frag.startsWith("<table")).toBe(true);
    expect(frag.match(/<td[^>]*>/g)!.every((t) => t.includes("font-family"))).toBe(true);
  });

  it("헤더: 테크이노베이션팀 · TDL Trend 제4호 · 배포 대상", () => {
    expect(frag).toContain("테크이노베이션팀");
    expect(frag).toContain("TDL Trend");
    expect(frag).toContain("제4호");
    expect(frag).toContain("발행일 2026.10.27");
    expect(frag).toContain("배포 대상 CL사업부");
    expect(frag).toContain('width="640"');
    expect(frag).toContain('bgcolor="#A72B2B"');
  });

  it("섹션 순서: 핵심 요약 → 한눈에 → 인사이트 → 추세 → 제언 → 참고 기사", () => {
    const order = ["핵심 요약", "이번 호 한눈에", "핵심 인사이트", "CL사업부 시사점", "추세 분석", "제언 및 향후 과제", "참고 기사"];
    const idx = order.map((s) => frag.indexOf(s));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it("레포냥·캐릭터 표현이 없음", () => {
    for (const w of ["레포냥", "냥", "츄르", "입고", "🤖", "😺"]) expect(frag).not.toContain(w);
  });

  it("근거 기사 번호가 원문 링크로 연결되고 참고 기사 표에 모두 실림", () => {
    expect(frag).toContain('href="https://example.com/sample/c1"');
    expect(frag).toMatch(/\[1\]<\/a>/);
    for (const a of sampleArticles) expect(frag).toContain(`href="${a.link}"`);
  });

  it("전체 문서와 텍스트 버전", () => {
    const html = renderEmailHtml(sampleContent, meta);
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("<!--[if mso]>");
    const text = renderPlainText(sampleContent, meta);
    expect(text).toContain("테크이노베이션팀 TDL Trend 제4호 (2026.10.27)");
    expect(text).toContain("[참고 기사]");
    expect(text).toContain("[1] AutoStore unveils");
  });

  it("통계가 없으면 인포그래픽만 빠지고 나머지는 렌더링", () => {
    const frag2 = renderFragment({ ...sampleContent, stats: undefined }, meta);
    expect(frag2).not.toContain("이번 호 한눈에");
    expect(frag2).toContain("핵심 인사이트");
  });

  it("지난 호가 없으면 추세 차트를 만들지 않음", () => {
    const first = {
      ...sampleContent,
      stats: { ...sampleContent.stats!, trend: { issues: [{ no: 1, date: "2026-10-27", current: true }], category: [], keywords: [] } },
    };
    const f = renderFragment(first, meta);
    expect(f).toContain("추세 분석");
    expect(f).not.toContain("호별 카테고리 추이");
  });
});

describe("표 기반 차트", () => {
  it("막대 길이가 값에 비례하고 이미지를 쓰지 않음", () => {
    const html = hbarChart([{ label: "A", value: 4 }, { label: "B", value: 2 }], { width: 576, labelWidth: 150 });
    const widths = [...html.matchAll(/bgcolor="#A72B2B"[^>]*width="(\d+)"|width="(\d+)"[^>]*bgcolor="#A72B2B"/g)].map((m) => Number(m[1] ?? m[2]));
    expect(widths).toHaveLength(2);
    expect(widths[0]).toBe(widths[1] * 2);
    expect(html).not.toContain("<img");
  });

  it("누적 막대 폭의 합이 전체 폭과 같고 0건 구간은 제외", () => {
    const html = stackedBar(
      [{ label: "x", value: 1, color: "#111111" }, { label: "y", value: 0, color: "#222222" }, { label: "z", value: 2, color: "#333333" }],
      { width: 300 },
    );
    expect(html).not.toContain("#222222\" ");
    const ws = [...html.matchAll(/bgcolor="#(?:111111|333333)"[^>]*width="(\d+)"|width="(\d+)"[^>]*bgcolor="#(?:111111|333333)"/g)].map((m) => Number(m[1] ?? m[2]));
    expect(ws.reduce((a, b) => a + b, 0)).toBe(300);
  });

  it("빈 데이터는 빈 문자열, 히트맵 색은 건수에 따라 진해짐", () => {
    expect(hbarChart([], { width: 500 })).toBe("");
    expect(stackedBar([{ label: "x", value: 0, color: "#000000" }], { width: 300 })).toBe("");
    expect(mix("#FFFFFF", "#A72B2B", 0)).toBe("#ffffff");
    expect(mix("#FFFFFF", "#A72B2B", 1)).toBe("#a72b2b");
    const hm = heatmap([{ label: "k", counts: [0, 1, 3] }], [{ label: "제1호" }, { label: "제2호" }, { label: "제3호", current: true }], { width: 576 });
    expect(hm).toContain("제3호");
    expect(trendStack([], { width: 500 })).toBe("");
  });
});

describe("스키마 & 초안", () => {
  it("예시 리포트는 저장용 스키마를 만족하고, Claude 출력 스키마는 통계 없이도 통과", () => {
    expect(StoredReportSchema.safeParse(sampleContent).success).toBe(true);
    const { stats: _stats, ...draft } = sampleContent;
    expect(ReportSchema.safeParse(draft).success).toBe(true);
  });

  it("기본 초안은 스키마를 만족하고 모든 기사를 테마에 인용", () => {
    const mk = (id: string, category: Article["category"]): Article => ({
      id, collectedAt: "", publishedAt: "2026-10-20T00:00:00Z", source: "s", region: "KR", title: `제목 ${id}`, link: `https://x/${id}`,
      summary: "요약입니다. 두 번째 문장입니다.", category, keywords: ["AMR"], selected: true,
    });
    const arts = [mk("A1", "AMR/AGV"), mk("A2", "AMR/AGV"), mk("A3", "소팅/보관설비"), mk("A4", "기타"), mk("A5", "글로벌 트렌드")];
    const d = buildFallbackDraft({ issueNo: 3, concept: "콘셉트", articles: arts, stats: sampleContent.stats! });
    expect(ReportSchema.safeParse(d).success).toBe(true);
    expect(new Set(d.themes.flatMap((t) => t.sourceArticleIds))).toEqual(new Set(arts.map((a) => a.id)));
    expect(d.themes.length).toBeLessThanOrEqual(3);
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

  it("기사 행 왕복 + 선정여부(제N호)", () => {
    const a: Article = {
      id: "A1", collectedAt: "c", publishedAt: "p", source: "s", region: "KR", title: "=t", link: "l", summary: "",
      category: "AMR/AGV", keywords: ["AMR", "쿠팡"], selected: false, publishedInIssue: 5,
    };
    const r = articleToRow(a);
    expect(r[8]).toBe("발행(제5호)");
    expect(rowToArticle(r)).toMatchObject({ id: "A1", category: "AMR/AGV", publishedInIssue: 5, selected: false, keywords: ["AMR", "쿠팡"] });
    expect(rowToArticle([...r.slice(0, 8), "발행(3차)", ...r.slice(9)])?.publishedInIssue).toBe(3);
  });
});
