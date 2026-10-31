import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

/**
 * apps-script/Code.gs 를 구글 Apps Script 환경을 흉내 낸 가짜(SpreadsheetApp, LockService, ContentService) 위에서 그대로 실행한다.
 * 실제 구글에서의 동작을 대신 검증하는 것은 아니고, 스크립트 로직(범위 해석, 텍스트 저장, 토큰 검사, 행 추가)을 확인한다.
 */
export const TEST_TOKEN = "test-token-0123456789-test-token";

class FakeSheet {
  grid: string[][] = [];
  maxRows = 1000;
  maxCols = 26;
  frozen = 0;
  formats = new Set<string>();
  constructor(public name: string) {}
  getName() { return this.name; }
  setFrozenRows(n: number) { this.frozen = n; }
  getLastRow() {
    for (let i = this.grid.length - 1; i >= 0; i--) if (this.grid[i]?.some((c) => c !== "" && c != null)) return i + 1;
    return 0;
  }
  getLastColumn() {
    let max = 0;
    for (const r of this.grid) for (let c = 0; c < (r?.length ?? 0); c++) if (r[c] !== "" && r[c] != null) max = Math.max(max, c + 1);
    return max;
  }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  insertRowsAfter(_after: number, n: number) { this.maxRows += n; }
  insertColumnsAfter(_after: number, n: number) { this.maxCols += n; }
  getRange(row: number, col: number, nRows: number, nCols: number) {
    if (row + nRows - 1 > this.maxRows || col + nCols - 1 > this.maxCols) throw new Error("The coordinates of the range are outside the dimensions of the sheet.");
    return {
      getValues: () => Array.from({ length: nRows }, (_, i) => Array.from({ length: nCols }, (_, j) => this.grid[row - 1 + i]?.[col - 1 + j] ?? "")),
      setNumberFormat: (f: string) => { this.formats.add(`${row},${col}:${f}`); },
      setValues: (vals: unknown[][]) => {
        if (vals.length !== nRows || vals.some((r) => r.length !== nCols)) throw new Error("The number of rows or columns in the data does not match the range.");
        vals.forEach((r, i) => r.forEach((v, j) => { (this.grid[row - 1 + i] ??= [])[col - 1 + j] = String(v); }));
      },
    };
  }
}

export function createAppsScriptServer(opts: { token?: string } = {}) {
  const sheets = new Map<string, FakeSheet>();
  const spreadsheet = {
    getName: () => "TDL_MI",
    getSheets: () => [...sheets.values()],
    getSheetByName: (n: string) => sheets.get(n) ?? null,
    insertSheet: (n: string) => { const s = new FakeSheet(n); sheets.set(n, s); return s; },
  };
  const output = (text: string) => ({ text, setMimeType() { return this; } });
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { createTextOutput: output, MimeType: { JSON: "JSON" } },
    JSON, String, Number, Math, Object, Error,
  };
  const code = fs.readFileSync(path.join(__dirname, "..", "apps-script", "Code.gs"), "utf8").replace(/var TOKEN = '[^']*';/, `var TOKEN = '${opts.token ?? TEST_TOKEN}';`);
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  const g = ctx as unknown as { doPost: (e: unknown) => { text: string }; doGet: () => { text: string } };

  let calls = 0;
  /** fetch 대용: Apps Script 웹 앱 주소로 보낸 요청을 doPost 로 전달 */
  const fetchImpl = (async (_url: string, init?: RequestInit) => {
    calls++;
    const out = g.doPost({ postData: { contents: String(init?.body) } });
    return new Response(out.text, { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;

  return { sheets, fetchImpl, doGet: () => JSON.parse(g.doGet().text), get calls() { return calls; } };
}
