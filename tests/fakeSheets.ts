import type { sheets_v4 } from "@googleapis/sheets";

/** 구글 시트 API 의 필요한 부분만 흉내 낸 메모리 구현 (테스트용) */
export function createFakeSheets() {
  const tabs = new Map<string, string[][]>();
  const calls: string[] = [];

  const colIndex = (c: string) => [...c].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const parse = (range: string) => {
    const m = range.match(/^(.+)!([A-Z]+)(\d+)?(?::([A-Z]+)(\d+)?)?$/);
    if (!m) throw new Error(`range? ${range}`);
    return { sheet: m[1], c1: colIndex(m[2]), r1: m[3] ? Number(m[3]) - 1 : 0, c2: m[4] ? colIndex(m[4]) : undefined };
  };
  const need = (sheet: string) => {
    const t = tabs.get(sheet);
    if (!t) throw new Error(`Unable to parse range: ${sheet}`);
    return t;
  };
  const write = (sheet: string, row: number, col: number, values: unknown[][]) => {
    const t = need(sheet);
    values.forEach((vals, i) => {
      const r = (t[row + i] ??= []);
      vals.forEach((v, j) => (r[col + j] = v == null ? "" : String(v)));
    });
  };

  const client = {
    spreadsheets: {
      get: async () => ({ data: { sheets: [...tabs.keys()].map((title) => ({ properties: { title } })) } }),
      batchUpdate: async ({ requestBody }: { requestBody: { requests: { addSheet: { properties: { title: string } } }[] } }) => {
        calls.push("batchUpdate");
        for (const r of requestBody.requests) tabs.set(r.addSheet.properties.title, []);
        return { data: {} };
      },
      values: {
        get: async ({ range }: { range: string }) => {
          calls.push(`get ${range}`);
          const { sheet, c1, r1, c2 } = parse(range);
          const rows = need(sheet).slice(r1).map((r) => (c2 === undefined ? r.slice(c1) : r.slice(c1, c2 + 1)));
          while (rows.length && rows.at(-1)!.every((c) => !c)) rows.pop();
          return { data: { values: rows } };
        },
        append: async ({ range, requestBody }: { range: string; requestBody: { values: unknown[][] } }) => {
          calls.push(`append ${range}`);
          const { sheet } = parse(range);
          const t = need(sheet);
          for (const vals of requestBody.values) t.push(vals.map((v) => (v == null ? "" : String(v))));
          return { data: {} };
        },
        update: async ({ range, requestBody }: { range: string; requestBody: { values: unknown[][] } }) => {
          calls.push(`update ${range}`);
          const { sheet, c1, r1 } = parse(range);
          write(sheet, r1, c1, requestBody.values);
          return { data: {} };
        },
        batchUpdate: async ({ requestBody }: { requestBody: { data: { range: string; values: unknown[][] }[] } }) => {
          for (const d of requestBody.data) {
            calls.push(`batch ${d.range}`);
            const { sheet, c1, r1 } = parse(d.range);
            write(sheet, r1, c1, d.values);
          }
          return { data: {} };
        },
      },
    },
  } as unknown as sheets_v4.Sheets;

  return { client, tabs, calls };
}
