import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Article } from "@/lib/types";
import { TEST_TOKEN, createAppsScriptServer } from "./appsScriptHarness";
import { sampleContent } from "./fixtures/content";

const srv = createAppsScriptServer();

beforeAll(async () => {
  process.env.STORE_MODE = "sheets";
  process.env.SHEETS_CACHE_SECONDS = "0";
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "tdl-as-"));
  process.env.SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/TEST/exec";
  process.env.SHEETS_WEBAPP_TOKEN = TEST_TOKEN;
  delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
  vi.stubGlobal("fetch", srv.fetchImpl);
  (await import("@/lib/store/sheets")).__setClient(null);
});

const art = (id: string, title: string): Article => ({
  id, collectedAt: "2026-10-20T00:00:00Z", publishedAt: "2026-10-18T00:00:00Z", source: `src-${id}`, region: "KR", title, link: `https://x.com/${id}`,
  summary: "요약", content: `${title} 본문 `.repeat(20), category: "기타", keywords: [], selected: false,
});

describe("Apps Script 방식으로 웹 모드 전체 흐름 (구글 클라우드 없음)", () => {
  it("환경변수만으로 연결 방식이 선택됨", async () => {
    const { sheetsVia } = await import("@/lib/config");
    expect(sheetsVia()).toBe("apps-script");
  });

  it("기사 적재 → 중복 제거 → 선정 → 작성 의뢰서 → 작성본 → 발행이 모두 시트(스크립트)를 통해 저장", async () => {
    const store = await import("@/lib/store");
    const h = await import("@/lib/newsletter/handoff");

    const r1 = await store.addArticles([art("A1", "=HYPERLINK(\"x\") 위험한 제목"), art("A2", "둘째 기사"), art("A3", "셋째 기사")]);
    expect(r1.added).toHaveLength(3);
    expect([...srv.sheets.keys()].sort()).toEqual(["Article_Bodies", "Handoffs", "Newsletter_Issues", "Raw_Articles"]);

    const again = await store.addArticles([art("A1", "=HYPERLINK(\"x\") 위험한 제목"), art("A4", "넷째 기사")]);
    expect(again.added.map((a) => a.id)).toEqual(["A4"]);

    await store.setSelection(["A1", "A2"], true);
    expect(srv.sheets.get("Raw_Articles")!.grid[1][8]).toBe("후보");
    expect((await store.listArticles()).filter((a) => a.selected).map((a) => a.id)).toEqual(expect.arrayContaining(["A1", "A2"]));

    const { prompt } = await h.createHandoff({ issueNo: 1, publishDate: "2026-10-27", concept: "관점", articleIds: ["A1", "A2", "A3"] });
    expect(prompt).toContain("둘째 기사 본문");
    expect((await h.listHandoffs())[0]).toMatchObject({ issueNo: 1, hasContent: false });

    const { stats: _s, ...draft } = sampleContent;
    const saved = await h.saveHandoffContent(1, JSON.stringify({ ...draft, themes: draft.themes.map((t) => ({ ...t, sourceArticleIds: ["A1", "A2", "A3"] })) }));
    expect(saved.missing).toEqual([]);
    expect(saved.content.stats?.total).toBe(3);
    expect((await h.listHandoffs())[0].hasContent).toBe(true);

    await store.saveIssue({ issueNo: 1, publishDate: "2026-10-27", concept: "c", articleIds: ["A1", "A2", "A3"], html: saved.html, keywords: ["AMR"], headline: "제목", createdAt: "t" });
    expect(srv.sheets.get("Raw_Articles")!.grid[1][8]).toBe("발행(제1호)");
    expect(srv.sheets.get("Newsletter_Issues")!.grid[1][0]).toBe("1");
    expect(await store.nextIssueNo()).toBe(2);

    // 서버가 재시작돼 캐시가 사라져도 시트에서 그대로 복구
    fs.rmSync(path.join(process.env.DATA_DIR!, "db.json"), { force: true });
    expect((await store.listIssues())[0].issueNo).toBe(1);
    expect((await store.getMeta()).articleCount).toBe(4);
  });

  it("호출 횟수가 폭주하지 않음 (한 번의 기사 적재에 스크립트 호출 20회 이내)", async () => {
    const store = await import("@/lib/store");
    const before = srv.calls;
    await store.addArticles([art("B1", "새 기사 하나")]);
    expect(srv.calls - before).toBeLessThanOrEqual(20);
  });
});
