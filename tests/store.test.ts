import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { Article } from "@/lib/types";

beforeAll(() => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "tdl-mi-"));
  delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
});

const a = (id: string, link: string, title: string): Article => ({
  id, collectedAt: "", publishedAt: new Date().toISOString(), source: "s", region: "KR", title, link, summary: "",
  category: "기타", keywords: [], selected: false,
});

describe("로컬 저장소", () => {
  it("URL/제목 중복을 제거하고 발행 시 호수를 기록", async () => {
    const store = await import("@/lib/store");
    const r1 = await store.addArticles([a("A1", "https://x.com/1", "첫 기사"), a("A2", "https://www.x.com/1/?utm_source=a", "다른 제목")]);
    expect(r1.added.map((x) => x.id)).toEqual(["A1"]);
    expect(r1.duplicates).toBe(1);
    const r2 = await store.addArticles([a("A3", "https://y.com/2", "첫 기사 "), a("A4", "https://y.com/3", "새 기사")]);
    expect(r2.added.map((x) => x.id)).toEqual(["A4"]);

    await store.setSelection(["A1", "A4"], true);
    expect((await store.listArticles()).filter((x) => x.selected)).toHaveLength(2);

    await store.saveIssue({ issueNo: 1, publishDate: "2026-10-20", concept: "c", articleIds: ["A1"], html: "<p/>", keywords: [], createdAt: "" });
    const [a1] = await store.getArticles(["A1"]);
    expect(a1.publishedInIssue).toBe(1);
    expect(a1.selected).toBe(false);
    expect(await store.nextIssueNo()).toBe(2);
  });
});
