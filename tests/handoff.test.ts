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
    await store.addArticles([art("M1", "메인 기사"), art("Q1", "냥스 기사"), art("C1", "츄르 기사")]);

    const { prompt } = await h.createHandoff({
      issueNo: 5, publishDate: "2026-10-20", concept: "콘셉트", articleIds: ["M1", "Q1", "C1"], mainArticleId: "M1", churuArticleId: "C1",
    });
    expect(prompt).toContain(`${config.newsletterName} 5차 입고 작성 의뢰서`);
    expect(prompt).toContain('role="churu"');
    expect(prompt).toContain('"quickNews"');
    expect((await h.listHandoffs())[0]).toMatchObject({ issueNo: 5, hasContent: false });

    await expect(h.saveHandoffContent(5, '{"headline": 1}')).rejects.toThrow(/출력 형식/);

    const saved = await h.saveHandoffContent(5, "```json\n" + JSON.stringify(sampleContent) + "\n```");
    expect(saved.content.mainReport.url).toBe("https://x.com/M1");
    expect(saved.content.quickNews[0]).toMatchObject({ articleId: "Q1", url: "https://x.com/Q1" });
    expect(saved.content.churuStation.url).toBe("https://x.com/C1");
    expect(saved.html).toContain("5차 입고");
    expect((await h.getHandoff(5))?.content?.headline).toBe(sampleContent.headline);
    expect((await h.listHandoffs())[0].hasContent).toBe(true);
  });
});
