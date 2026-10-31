import { describe, expect, it } from "vitest";
import { hbarChart, heatmap, inkFor, mix, rampColor, stackedBar, themeMatrix, trendStack } from "@/lib/email/charts";
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

  it("뼈대는 표, 스타일은 인라인 (표 모드: 이미지 없음)", () => {
    expect(frag).not.toMatch(/<img/i);
    expect(frag).not.toMatch(/class=/);
    expect(frag).not.toMatch(/<style/);
    expect(frag).not.toMatch(/<(div|ul|ol|li|p|svg|canvas|script)[ >]/);
    expect(frag.startsWith("<table")).toBe(true);
    expect(frag.match(/<td[^>]*>/g)!.every((t) => t.includes("font-family"))).toBe(true);
  });

  it("헤더: TDL TREND REPORT 마크 · 제4호 · 배포 대상 · 이번 호 주제", () => {
    expect(frag).toContain("테크이노베이션팀");
    expect(frag).toContain(">TDL</span>"); // 이미지가 없을 때 글자 마크
    expect(frag).toContain(">TREND REPORT</span>");
    expect(frag).toContain("제4호");
    expect(frag).toContain("2026.10.27 발행");
    expect(frag).toContain("배포 대상 CL사업부");
    expect(frag).toContain('width="640"');
    expect(frag).toContain("border-top:4px solid #A72B2B");
    const theme = frag.indexOf("이번 호 주제");
    expect(theme).toBeGreaterThan(frag.indexOf("제4호"));
    expect(frag.indexOf(sampleContent.issueTheme!)).toBeGreaterThan(theme);
    expect(frag.indexOf(sampleContent.headline)).toBeGreaterThan(frag.indexOf(sampleContent.issueTheme!));
  });

  it("마크 이미지: 크기·대체 글자 포함, 주제가 없으면 제목이 맨 위 큰 제목", () => {
    const withMark = renderFragment(sampleContent, { ...meta, markSrc: "https://x.test/brand/tdl-trend-report.png" });
    expect(withMark).toMatch(/<img src="https:\/\/x\.test\/brand\/tdl-trend-report\.png" width="150" height="69" alt="TDL TREND REPORT"/);
    expect(withMark).not.toContain(">TREND REPORT</span>");
    const noTheme = renderFragment({ ...sampleContent, issueTheme: undefined }, meta);
    expect(noTheme).not.toContain("이번 호 주제");
    expect(noTheme).toContain(sampleContent.headline);
  });

  it("테크이노베이션팀의 한마디: 맨 위, 어두운 상자로 눈에 띄게", () => {
    const note = frag.indexOf("테크이노베이션팀의 한마디");
    expect(note).toBeGreaterThan(frag.indexOf(sampleContent.issueTheme!));
    expect(note).toBeLessThan(frag.indexOf("핵심 요약"));
    expect(frag).toContain(sampleContent.teamNote!.slice(0, 30));
    expect(frag).toContain('bgcolor="#161616"');
    expect(renderFragment({ ...sampleContent, teamNote: "" }, meta)).not.toContain("의 한마디");
  });

  it("섹션 순서: 한마디 → 핵심 요약 → 인사이트 → 추세 → 제언 → 참고 기사", () => {
    const order = ["의 한마디", "핵심 요약", "핵심 인사이트", "CL사업부 시사점", "추세 분석", "제언 및 향후 과제", "참고 기사"];
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

  it("한눈에·핵심 수치 줄 없음, 주제-기사 연결표, 검증된 카테고리 색", () => {
    for (const w of ["이번 호 한눈에", "선정 기사", "지난 호 연관", "가장 많이 다룬 분야", "카테고리 구성", "많이 다룬 기업·기술"]) expect(frag).not.toContain(w);
    expect(frag).not.toContain("국내 : 해외");
    expect(frag).not.toContain("국내·해외");
    expect(frag).not.toContain("지난 호와의 관계");
    expect(frag).toContain("주제와 근거 기사의 연결");
    expect(frag.match(/●/g)!.length).toBe(sampleContent.themes.reduce((n, t) => n + t.sourceArticleIds.length, 0));
    expect(frag).toContain("#2A78D6"); // 검증된 카테고리 색 (AMR/AGV)
    expect(frag).not.toContain("#4F7F8C"); // 예전 팔레트 제거
  });

  it("하이라이트: 핵심 요약 맨 위 한 줄 결론, 주제별 핵심 한 줄, **구절**은 형광펜", () => {
    expect(frag.indexOf("한 줄 결론")).toBeGreaterThan(frag.indexOf("핵심 요약"));
    expect(frag).toContain(sampleContent.keyTakeaway!);
    expect(frag).toContain(sampleContent.themes[0].takeaway!);
    expect(frag).not.toContain("**");
    const marks = frag.match(/background-color:#FFEDA8;font-weight:bold/g) ?? [];
    expect(marks.length).toBeGreaterThanOrEqual(8);
    expect(frag).toContain('font-weight:bold;color:#222222;padding:0 2px">시범에서 증설 단계로 전환</span>');
  });

  it("이미지 모드: 인포그래픽을 크기·대체 글자가 있는 <img> 로 넣고 표 차트는 쓰지 않음", () => {
    const charts = {
      map: { src: "/api/charts/4/map.png?s=x", height: 260, alt: "인사이트 맵" },
      trend: { src: "/api/charts/4/trend.png?s=x", height: 160, alt: "호별 카테고리 추이" },
      heatmap: { src: "/api/charts/4/heatmap.png?s=x", height: 200, alt: "키워드 호별 등장" },
    };
    const img = renderFragment(sampleContent, { ...meta, charts });
    const imgs = img.match(/<img [^>]+>/g)!;
    expect(imgs).toHaveLength(3);
    for (const tag of imgs) {
      expect(tag).toMatch(/width="576"/);
      expect(tag).toMatch(/height="\d+"/);
      expect(tag).toMatch(/alt="[^"]+"/);
      expect(tag).toMatch(/display:block/);
    }
    expect(img).not.toContain("주제 1</td>"); // 표 버전 연결표 대신 이미지
    expect(img).not.toMatch(/<(div|svg|canvas|script)[ >]/);
  });

  it("전체 문서와 텍스트 버전", () => {
    const html = renderEmailHtml(sampleContent, meta);
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("<!--[if mso]>");
    const text = renderPlainText(sampleContent, meta);
    expect(text).toContain("테크이노베이션팀 TDL Trend 제4호 (2026.10.27)");
    expect(text).toContain("[참고 기사]");
    expect(text).toContain("[1] AutoStore unveils");
    expect(text).toContain("▶ 한 줄 결론:");
    expect(text).toContain(`이번 호 주제: ${sampleContent.issueTheme}`);
    expect(text).toContain("[테크이노베이션팀의 한마디]");
    expect(text).toContain("「시범에서 증설 단계로 전환」");
    expect(text).not.toContain("**");
  });

  it("통계가 없으면 인포그래픽만 빠지고 나머지는 렌더링", () => {
    const frag2 = renderFragment({ ...sampleContent, stats: undefined }, meta);
    expect(frag2).not.toContain("호별 카테고리 추이");
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

  it("채운 색 위 글자색: 흰색이 기본, 노랑처럼 밝은 색만 검정", () => {
    expect(inkFor("#2A78D6")).toBe("#FFFFFF");
    expect(inkFor("#EB6834")).toBe("#FFFFFF");
    expect(inkFor("#1BAF7A")).toBe("#FFFFFF");
    expect(inkFor("#EDA100")).toBe("#0B0B0B");
  });

  it("크기 색은 파랑 한 가지, 건수가 많을수록 진해짐", () => {
    expect(rampColor(0, 5)).toBe("#F5F5F5");
    expect(rampColor(1, 5)).toBe("#CDE2FB");
    expect(rampColor(5, 5)).toBe("#104281");
  });

  it("기사-주제 연결표: 인용한 칸에만 ● 표시", () => {
    const html = themeMatrix(
      [{ id: "a", no: 1, title: "기사 A", href: "https://x/a" }, { id: "b", no: 2, title: "기사 B", href: "https://x/b" }],
      [{ title: "T1", sourceArticleIds: ["a"] }, { title: "T2", sourceArticleIds: ["a", "b"] }],
      { width: 576, anchor: (x, h) => `<a href="${h}">${x}</a>` },
    );
    expect(html.match(/●/g)).toHaveLength(3);
    expect(html).toContain("주제 2");
    expect(themeMatrix([], [], { width: 100, anchor: (x) => x })).toBe("");
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
    // 예전에 저장된 리포트(한 줄 결론 없음)도 저장용 스키마는 통과, Claude 출력 스키마는 요구
    const { keyTakeaway: _k, issueTheme: _i, teamNote: _n, ...old } = sampleContent;
    const oldThemes = { ...old, themes: old.themes.map(({ takeaway: _t, ...t }) => t) };
    expect(StoredReportSchema.safeParse(oldThemes).success).toBe(true);
    expect(ReportSchema.safeParse({ ...oldThemes, stats: undefined }).success).toBe(false);
    // 이번 호 주제와 팀의 한마디는 Claude 출력에 필수
    expect(ReportSchema.safeParse({ ...draft, issueTheme: undefined }).success).toBe(false);
    expect(ReportSchema.safeParse({ ...draft, teamNote: undefined }).success).toBe(false);
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

  it("발행 이력에 리포트 데이터(JSON)도 함께 저장되고 복원됨", () => {
    const row = issueToRow({ issueNo: 4, publishDate: "2026-10-27", concept: "c", articleIds: ["A1"], html: "<p/>", keywords: ["k"], createdAt: "t", content: sampleContent });
    expect(row.every((c) => c.length <= 49_000)).toBe(true);
    expect(rowToIssue(row)!.content).toEqual(JSON.parse(JSON.stringify(sampleContent)));
    const noContent = rowToIssue(issueToRow({ issueNo: 1, publishDate: "d", concept: "c", articleIds: [], html: "", keywords: [], createdAt: "t" }))!;
    expect(noContent.content).toBeUndefined();
    const broken = [...row.slice(0, 11), '{"headline": "잘림', ""];
    expect(rowToIssue(broken)!.content).toBeUndefined(); // 깨진 데이터는 무시하고 메일 HTML 만 보여 줌
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
