import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { Article } from "@/lib/types";
import { createFakeSheets } from "./fakeSheets";
import { sampleContent } from "./fixtures/content";

const fake = createFakeSheets();

beforeAll(async () => {
  process.env.STORE_MODE = "sheets";
  process.env.SHEETS_CACHE_SECONDS = "0";
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "tdl-sheets-"));
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "fake-sheet";
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON = "{}";
  (await import("@/lib/store/sheets")).__setClient(fake.client);
});

const art = (id: string, title: string, over: Partial<Article> = {}): Article => ({
  id, collectedAt: "2026-10-20T00:00:00Z", publishedAt: "2026-10-18T00:00:00Z", source: `src-${id}`, region: "KR", title, link: `https://x.com/${id}`,
  summary: "요약", content: `${title} 본문 `.repeat(20), category: "기타", keywords: [], selected: false, ...over,
});

describe("구글 시트가 원본인 웹 모드", () => {
  it("스키마 생성 → 기사 적재(중복 제거) → 다른 서버 인스턴스에서도 보임", async () => {
    const store = await import("@/lib/store");
    const r1 = await store.addArticles([art("A1", "첫 기사"), art("A2", "둘째 기사")]);
    expect(r1.added).toHaveLength(2);
    expect([...fake.tabs.keys()].sort()).toEqual(["Article_Bodies", "Handoffs", "Newsletter_Issues", "Raw_Articles"]);
    expect(fake.tabs.get("Raw_Articles")!.map((r) => r[0])).toEqual(["ID", "A1", "A2"]);
    expect(fake.tabs.get("Article_Bodies")!.length).toBe(3);

    // 서버가 재시작돼 캐시가 사라져도 시트에서 복구
    fs.rmSync(path.join(process.env.DATA_DIR!, "db.json"), { force: true });
    const again = await store.addArticles([art("A1", "첫 기사"), art("A3", "셋째 기사")]);
    expect(again.added.map((a) => a.id)).toEqual(["A3"]);
    expect(again.duplicates).toBe(1);
    expect((await store.listArticles()).map((a) => a.id).sort()).toEqual(["A1", "A2", "A3"]);
  });

  it("시트를 사람이 직접 고쳐도 반영", async () => {
    const store = await import("@/lib/store");
    const t = fake.tabs.get("Raw_Articles")!;
    t[1][7] = "AMR/AGV"; // 카테고리 칸 직접 수정
    expect((await store.getArticles(["A1"]))[0].category).toBe("AMR/AGV");
  });

  it("선정 체크가 시트 '선정여부' 칸에 기록", async () => {
    const store = await import("@/lib/store");
    await store.setSelection(["A1"], true);
    expect(fake.tabs.get("Raw_Articles")![1][8]).toBe("후보");
    expect((await store.listArticles()).find((a) => a.id === "A1")?.selected).toBe(true);
  });

  it("작성 의뢰서 → 작성본이 시트 Handoffs 에 저장되고 본문은 Article_Bodies 에서 읽음", async () => {
    const h = await import("@/lib/newsletter/handoff");
    const { prompt } = await h.createHandoff({
      issueNo: 1, publishDate: "2026-10-20", concept: "콘셉트", articleIds: ["A1", "A2"], mainArticleId: "A1",
    });
    expect(prompt).toContain("첫 기사 본문 첫 기사 본문");
    expect(fake.tabs.get("Handoffs")![1][0]).toBe("1");
    expect((await h.listHandoffs())[0]).toMatchObject({ issueNo: 1, hasContent: false });

    const saved = await h.saveHandoffContent(1, JSON.stringify(sampleContent));
    expect(saved.content.mainReport.url).toBe("https://x.com/A1");
    expect((await h.listHandoffs())[0].hasContent).toBe(true);
    expect(JSON.parse(fake.tabs.get("Handoffs")![1][2]).headline).toBe(sampleContent.headline);
    expect(((await h.getHandoff(1)) as { html: string }).html).toContain("1차 입고");

    // 의뢰서를 다시 저장하면(선정 변경) 이전 작성본은 비워짐
    await h.createHandoff({ issueNo: 1, publishDate: "2026-10-20", concept: "바뀐 콘셉트", articleIds: ["A1", "A3"], mainArticleId: "A1" });
    expect(fake.tabs.get("Handoffs")![1][2]).toBe("");
  });

  it("발행 확정: 이력 시트 저장 + 기사에 발행 차수 기록", async () => {
    const store = await import("@/lib/store");
    await store.saveIssue({ issueNo: 1, publishDate: "2026-10-20", concept: "c", articleIds: ["A1"], html: "<p>".repeat(30000), keywords: ["AMR"], createdAt: "t" });
    const issues = fake.tabs.get("Newsletter_Issues")!;
    expect(issues[1][0]).toBe("1");
    expect(issues[1].every((c) => (c ?? "").length <= 49_000)).toBe(true);
    expect(fake.tabs.get("Raw_Articles")![1][8]).toBe("발행(1차)");
    expect(await store.nextIssueNo()).toBe(2);
    expect((await store.getMeta()).issueCount).toBe(1);
  });

  it("시트 쓰기 실패는 경고가 아니라 오류", async () => {
    const store = await import("@/lib/store");
    const sheets = await import("@/lib/store/sheets");
    const broken = createFakeSheets();
    broken.client.spreadsheets.values.append = async () => {
      throw new Error("quota exceeded");
    };
    sheets.__setClient(broken.client);
    await expect(store.addArticles([art("Z9", "새 기사")])).rejects.toThrow(/구글 시트에 저장하지 못했습니다/);
    sheets.__setClient(fake.client);
  });
});
