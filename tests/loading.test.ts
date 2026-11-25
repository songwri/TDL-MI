import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cached, invalidate } from "@/lib/cache";
import { createFakeSheets } from "./fakeSheets";

afterEach(() => {
  vi.useRealTimers();
  invalidate();
});

describe("서버 캐시 (soft 안이면 그대로, hard 안이면 일단 보여 주고 뒤에서 새로, 동시 요청은 한 번만)", () => {
  it("soft 안에서는 다시 읽지 않고, 지나면 옛 값을 주면서 뒤에서 새로 읽음", async () => {
    vi.useFakeTimers();
    let n = 0;
    const load = async () => ++n;
    const opts = { soft: 1000, hard: 60_000 };
    expect(await cached("k", opts, load)).toBe(1);
    vi.advanceTimersByTime(500);
    expect(await cached("k", opts, load)).toBe(1);
    expect(n).toBe(1);
    vi.advanceTimersByTime(1000); // soft 지남
    expect(await cached("k", opts, load)).toBe(1); // 기다리지 않고 옛 값
    await vi.advanceTimersByTimeAsync(0);
    expect(n).toBe(2); // 뒤에서 새로 읽음
    expect(await cached("k", opts, load)).toBe(2);
  });

  it("hard 를 넘으면 새 값을 기다리고, 동시에 여러 번 불러도 읽기는 한 번", async () => {
    vi.useFakeTimers();
    let n = 0;
    const load = async () => {
      await new Promise((r) => setTimeout(r, 50));
      return ++n;
    };
    const opts = { soft: 10, hard: 100 };
    const first = Promise.all([cached("k", opts, load), cached("k", opts, load), cached("k", opts, load)]);
    await vi.advanceTimersByTimeAsync(60);
    expect(await first).toEqual([1, 1, 1]);
    vi.advanceTimersByTime(500); // hard 지남
    const p = cached("k", opts, load);
    await vi.advanceTimersByTimeAsync(60);
    expect(await p).toBe(2);
  });

  it("fresh 는 건너뛰고, 뒤에서 읽다 실패해도 기존 값을 계속 쓰며, invalidate 는 버림", async () => {
    vi.useFakeTimers();
    let n = 0;
    let fail = false;
    const load = async () => {
      if (fail) throw new Error("시트 오류");
      return ++n;
    };
    expect(await cached("k", { soft: 10, hard: 10_000 }, load)).toBe(1);
    expect(await cached("k", { soft: 10, hard: 10_000, fresh: true }, load)).toBe(2);
    fail = true;
    vi.advanceTimersByTime(100);
    expect(await cached("k", { soft: 10, hard: 10_000 }, load)).toBe(2); // 실패해도 옛 값
    await vi.advanceTimersByTimeAsync(0);
    invalidate("k");
    await expect(cached("k", { soft: 10 }, load)).rejects.toThrow("시트 오류"); // 값이 없으면 오류를 그대로
  });
});

describe("인사이트 방문 한 번에 읽는 구글 시트 횟수", () => {
  const fake = createFakeSheets();
  beforeAll(async () => {
    process.env.STORE_MODE = "sheets";
    process.env.SHEETS_CACHE_SECONDS = "20";
    process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "tdl-loading-"));
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "fake-sheet";
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON = "{}";
    (await import("@/lib/store/sheets")).__setClient(fake.client);
  });
  const reads = () => fake.calls.filter((c) => c.startsWith("get")).length;

  it("처음에만 읽고, 이어지는 방문은 시트를 읽지 않음 (예전에는 매번 지표·공급사 2회)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { GET } = await import("@/app/api/insights/route");
    const visit = async (q = "") => {
      const n0 = reads();
      const res = await GET(new Request(`http://x/api/insights?days=180${q}`));
      expect(res.status).toBe(200);
      return { reads: reads() - n0, res };
    };
    const first = await visit();
    expect(first.reads).toBe(4); // 기사 · 발행 이력 · 지표 · 공급사
    expect(first.res.headers.get("cache-control")).toContain("max-age=30");
    expect((await visit()).reads).toBe(0);
    vi.advanceTimersByTime(60_000); // 1분 뒤에도 (예전에는 20초만 지나도 다시 읽음)
    expect((await visit()).reads).toBe(0);
    vi.advanceTimersByTime(6 * 60_000); // 7분 뒤: 일단 바로 응답하고, 기사·발행 이력(2)과 공급사(1)만 뒤에서 새로 읽음 (지표는 30분)
    const stale = await visit();
    expect(stale.reads).toBe(3);
    expect(stale.res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 30)); // 뒤에서 읽던 것이 끝나길 기다림 (읽는 중이면 새로고침이 그것을 이어받음)
    // 새로고침 버튼(fresh=1): 브라우저 저장 없이 모두 다시 읽음
    const fresh = await visit("&fresh=1");
    expect(fresh.reads).toBe(4);
    expect(fresh.res.headers.get("cache-control")).toBe("no-store");
  });
});
