import { describe, expect, it } from "vitest";
import { createAppsScriptClient, pingAppsScript } from "@/lib/store/appsScript";
import { TEST_TOKEN, createAppsScriptServer } from "./appsScriptHarness";

const URL_ = "https://script.google.com/macros/s/TEST/exec";

describe("Apps Script 연결 (무료 방식)", () => {
  it("탭 생성 → 머리글 → 추가·수정·조회가 구글 시트 API 와 같은 모양으로 동작", async () => {
    const srv = createAppsScriptServer();
    const c = createAppsScriptClient(URL_, TEST_TOKEN, srv.fetchImpl);

    await c.spreadsheets.batchUpdate({ spreadsheetId: "", requestBody: { requests: [{ addSheet: { properties: { title: "Raw" } } }] } });
    expect((await c.spreadsheets.get({ spreadsheetId: "" })).data.sheets?.map((s) => s.properties?.title)).toEqual(["Raw"]);
    expect(srv.sheets.get("Raw")!.frozen).toBe(1);

    await c.spreadsheets.values.batchUpdate({ spreadsheetId: "", requestBody: { valueInputOption: "RAW", data: [{ range: "Raw!A1", values: [["ID", "제목"]] }] } });
    await c.spreadsheets.values.append({ spreadsheetId: "", range: "Raw!A1", requestBody: { values: [["A1", "첫 기사"], ["A2", "=SUM(1,2) 수식처럼 보이는 제목"]] } });
    await c.spreadsheets.values.append({ spreadsheetId: "", range: "Raw!A1", requestBody: { values: [["A3", "셋째"]] } });

    const all = (await c.spreadsheets.values.get({ spreadsheetId: "", range: "Raw!A2:Z" })).data.values;
    expect(all).toEqual([["A1", "첫 기사"], ["A2", "=SUM(1,2) 수식처럼 보이는 제목"], ["A3", "셋째"]]);
    expect((await c.spreadsheets.values.get({ spreadsheetId: "", range: "Raw!A:A" })).data.values).toEqual([["ID"], ["A1"], ["A2"], ["A3"]]);

    // 특정 칸만 수정 (선정여부 칸처럼 B 열)
    await c.spreadsheets.values.batchUpdate({ spreadsheetId: "", requestBody: { valueInputOption: "RAW", data: [{ range: "Raw!B3", values: [["후보"]] }] } });
    expect((await c.spreadsheets.values.get({ spreadsheetId: "", range: "Raw!A2:B4" })).data.values?.[1]).toEqual(["A2", "후보"]);

    await c.spreadsheets.values.update({ spreadsheetId: "", range: "Raw!A4", requestBody: { values: [["A3", "수정됨"]] } });
    expect((await c.spreadsheets.values.get({ spreadsheetId: "", range: "Raw!B4" })).data.values).toEqual([["수정됨"]]);
  });

  it("모든 값을 글자로 저장(수식 방지)하고, 큰 행 추가에서도 시트 크기를 자동으로 늘림", async () => {
    const srv = createAppsScriptServer();
    const c = createAppsScriptClient(URL_, TEST_TOKEN, srv.fetchImpl);
    await c.spreadsheets.batchUpdate({ spreadsheetId: "", requestBody: { requests: [{ addSheet: { properties: { title: "T" } } }] } });
    await c.spreadsheets.values.append({ spreadsheetId: "", range: "T!A1", requestBody: { values: [["=1+1", 5, null]] } });
    const sheet = srv.sheets.get("T")!;
    expect([...sheet.formats].every((f) => f.endsWith(":@"))).toBe(true);
    expect((await c.spreadsheets.values.get({ spreadsheetId: "", range: "T!A1:C1" })).data.values).toEqual([["=1+1", "5"]]);
    const many = Array.from({ length: 1200 }, (_, i) => [`R${i}`]);
    for (let i = 0; i < many.length; i += 400) await c.spreadsheets.values.append({ spreadsheetId: "", range: "T!A1", requestBody: { values: many.slice(i, i + 400) } });
    expect(sheet.getLastRow()).toBe(1201);
    expect(sheet.getMaxRows()).toBeGreaterThanOrEqual(1201);
  });

  it("빈 탭은 빈 배열, 없는 탭은 알아볼 수 있는 오류", async () => {
    const srv = createAppsScriptServer();
    const c = createAppsScriptClient(URL_, TEST_TOKEN, srv.fetchImpl);
    await c.spreadsheets.batchUpdate({ spreadsheetId: "", requestBody: { requests: [{ addSheet: { properties: { title: "Empty" } } }] } });
    expect((await c.spreadsheets.values.get({ spreadsheetId: "", range: "Empty!A2:Z" })).data.values).toEqual([]);
    await expect(c.spreadsheets.values.get({ spreadsheetId: "", range: "Nope!A2:Z" })).rejects.toThrow(/시트 탭이 없습니다: Nope/);
  });

  it("토큰이 틀리면 안내 문구와 함께 거절", async () => {
    const srv = createAppsScriptServer();
    const c = createAppsScriptClient(URL_, "wrong-token", srv.fetchImpl);
    await expect(c.spreadsheets.get({ spreadsheetId: "" })).rejects.toThrow(/TOKEN 이 맞지 않습니다/);
  });

  it("스크립트의 TOKEN 을 아직 바꾸지 않았으면 그렇게 알려 줌", async () => {
    const srv = createAppsScriptServer({ token: "여기에-길고-랜덤한-문자열을-넣으세요" });
    const c = createAppsScriptClient(URL_, "아무거나", srv.fetchImpl);
    await expect(c.spreadsheets.get({ spreadsheetId: "" })).rejects.toThrow(/TOKEN 을 바꾼 뒤/);
  });

  it("브라우저로 주소를 열면 연결 확인 응답만 나오고 시트 내용은 보이지 않음", () => {
    const srv = createAppsScriptServer();
    expect(srv.doGet()).toEqual({ ok: true, data: { service: "TDL Trend sheet bridge", version: 2 } });
  });

  it("로그인 화면이 돌아오면 배포 권한 안내, 일시 오류는 한 번 재시도", async () => {
    const login = (async () => new Response("<html>Sign in - Google Accounts accounts.google.com</html>", { status: 200 })) as unknown as typeof fetch;
    await expect(createAppsScriptClient(URL_, "t", login).spreadsheets.get({ spreadsheetId: "" })).rejects.toThrow(/모든 사용자/);

    let n = 0;
    const flaky = (async () => {
      n++;
      if (n === 1) return new Response("<html>Service invoked too many times for one day</html>", { status: 200 });
      return new Response(JSON.stringify({ ok: true, data: ["A"] }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await createAppsScriptClient(URL_, "t", flaky).spreadsheets.get({ spreadsheetId: "" });
    expect(n).toBe(2);
    expect(r.data.sheets?.[0].properties?.title).toBe("A");
  });

  it("연결 확인: 탭 목록 반환", async () => {
    const srv = createAppsScriptServer();
    srv.sheets.set("Raw_Articles", undefined as never);
    srv.sheets.delete("Raw_Articles");
    const c = createAppsScriptClient(URL_, TEST_TOKEN, srv.fetchImpl);
    await c.spreadsheets.batchUpdate({ spreadsheetId: "", requestBody: { requests: [{ addSheet: { properties: { title: "Raw_Articles" } } }] } });
    expect(await pingAppsScript(URL_, TEST_TOKEN, srv.fetchImpl)).toEqual(["Raw_Articles"]);
  });
});
