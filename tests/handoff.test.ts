import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { Article } from "@/lib/types";
import { sampleContent } from "./fixtures/content";

beforeAll(() => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "tdl-handoff-"));
  delete process.env.LETTER_WRITER;
});

const art = (id: string, title: string): Article => ({
  id, collectedAt: "", publishedAt: "2026-10-15T00:00:00Z", source: `src-${id}`, region: "KR", title, link: `https://x.com/${id}`,
  summary: "요약", category: "기타", keywords: [], selected: true,
});

describe("Claude Code 작성 의뢰서", () => {
  it("의뢰서 저장 → 작성본 검증·링크 고정 → 렌더링", async () => {
    const { config, writerMode } = await import("@/lib/config");
    expect(writerMode()).toBe("claude-code");
    const store = await import("@/lib/store");
    const h = await import("@/lib/newsletter/handoff");
    await store.addArticles([art("M1", "메인 기사"), art("Q1", "둘째 기사"), art("C1", "셋째 기사")]);

    const { prompt } = await h.createHandoff({ issueNo: 5, publishDate: "2026-10-20", concept: "콘셉트", articleIds: ["M1", "Q1", "C1"] });
    expect(prompt).toContain(`${config.newsletterName} 제5호 작성 의뢰서`);
    expect(prompt).toContain("선정 기사 3건");
    expect(prompt).toContain("[이번 호 통계");
    expect(prompt).toContain("합니다체");
    expect(prompt).toContain('"themes"');
    for (const w of ["레포냥", "해요체", "츄르"]) expect(prompt).not.toContain(w);
    expect((await h.listHandoffs())[0]).toMatchObject({ issueNo: 5, hasContent: false });

    await expect(h.saveHandoffContent(5, '{"headline": 1}')).rejects.toThrow(/출력 형식/);

    const { stats: _s, ...draft } = sampleContent;
    const withIds = { ...draft, themes: draft.themes.map((t, i) => ({ ...t, sourceArticleIds: i === 0 ? ["M1", "Q1", "ZZ"] : i === 1 ? ["Q1"] : [] })) };
    const saved = await h.saveHandoffContent(5, "```json\n" + JSON.stringify(withIds) + "\n```");
    expect(saved.content.themes[0].sourceArticleIds).toEqual(["M1", "Q1"]); // 없는 기사 ID 는 제거
    expect(saved.missing.map((a) => a.id)).toEqual(["C1"]); // 어느 테마에도 인용되지 않은 기사 알림
    expect(saved.content.stats?.total).toBe(3); // 통계는 서버가 계산
    expect(saved.html).toContain("제5호");
    expect(saved.html).toContain('href="https://x.com/M1"');
    expect(saved.html).toContain('src="/brand/tdl-trend-report.png" width="150" height="69" alt="TDL TREND REPORT"'); // 마크 이미지 (표 버전은 글자 마크)
    expect(saved.tables.html).not.toContain("tdl-trend-report.png");
    expect((await h.getHandoff(5))?.content?.headline).toBe(sampleContent.headline);

    // 인포그래픽 이미지: 서명된 주소만 PNG 로 열림
    const map = saved.html.match(/src="(\/api\/charts\/5\/map\.png\?[^"]+)"/)![1].replace(/&amp;/g, "&");
    const { GET } = await import("@/app/api/charts/[issueNo]/[chart]/route");
    const call = (url: string) => {
      const u = new URL(url, "http://local");
      const [, , , n, file] = u.pathname.split("/");
      return GET(new Request(u), { params: Promise.resolve({ issueNo: n, chart: file }) });
    };
    const ok = await call(map);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await ok.arrayBuffer());
    expect([...bytes.slice(1, 4)].map((b) => String.fromCharCode(b)).join("")).toBe("PNG");
    expect((await call(map.replace(/s=[^&]+/, "s=forged"))).status).toBe(403);
    expect((await call("/api/charts/5/nope.png?s=x")).status).toBe(404);
    expect(saved.tables.html).not.toContain("<img"); // 예비 표 버전
    expect((await h.listHandoffs())[0].hasContent).toBe(true);
  });
});
