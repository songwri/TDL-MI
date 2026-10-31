import type { sheets_v4 } from "@googleapis/sheets";

/**
 * Google Apps Script 웹 앱(apps-script/Code.gs)을 통해 시트를 읽고 쓰는 클라이언트.
 * 구글 클라우드 프로젝트·서비스 계정·결제 정보가 필요 없다. 시트 쪽 스크립트에 붙인 TOKEN 으로 보호한다.
 * store/sheets.ts 가 쓰는 구글 시트 API 의 일부(get / batchUpdate / values.get·append·update·batchUpdate)만 같은 모양으로 제공한다.
 */
type Fetch = typeof fetch;

const TIMEOUT_MS = 40_000;

export function createAppsScriptClient(url: string, token: string, fetchImpl: Fetch = fetch): sheets_v4.Sheets {
  async function once<T>(op: string, args: Record<string, unknown>): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        // text/plain: Apps Script 웹 앱이 받는 가장 단순한 형식
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ token, op, ...args }),
        redirect: "follow",
        signal: ctrl.signal,
      });
    } catch (e) {
      throw new Retryable(ctrl.signal.aborted ? "시트 연결 시간 초과" : `시트 연결 실패: ${(e as Error).message}`);
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text();
    let body: { ok: boolean; data?: T; error?: string };
    try {
      body = JSON.parse(text);
    } catch {
      // JSON 이 아니면 구글 로그인 화면이나 오류 페이지
      if (/accounts\.google\.com|Sign in|로그인/.test(text)) {
        throw new Error("Apps Script 배포의 액세스 권한이 '모든 사용자'가 아닙니다. 배포 관리에서 권한을 바꾼 뒤 새 버전으로 다시 배포해 주세요.");
      }
      if (/Service invoked too many times|too many times|일시적/.test(text)) throw new Retryable("구글 Apps Script 호출이 일시적으로 몰렸습니다.");
      throw new Retryable(`Apps Script 응답을 읽을 수 없습니다 (HTTP ${res.status}): ${text.slice(0, 100).replace(/\s+/g, " ")}`);
    }
    if (!body.ok) {
      if (body.error === "unauthorized") throw new Error("Apps Script TOKEN 이 맞지 않습니다. 시트 스크립트의 TOKEN 과 환경변수 SHEETS_WEBAPP_TOKEN 이 같은 값인지 확인해 주세요.");
      throw new Error(`시트 스크립트 오류: ${body.error}`);
    }
    return body.data as T;
  }

  /** 일시적 오류(네트워크, 호출 폭주)는 한 번 더 시도 */
  async function call<T>(op: string, args: Record<string, unknown> = {}): Promise<T> {
    try {
      return await once<T>(op, args);
    } catch (e) {
      if (!(e instanceof Retryable)) throw e;
      await new Promise((r) => setTimeout(r, 1500));
      try {
        return await once<T>(op, args);
      } catch (e2) {
        throw new Error((e2 as Error).message);
      }
    }
  }

  const client = {
    spreadsheets: {
      get: async () => ({ data: { sheets: (await call<string[]>("sheets")).map((title) => ({ properties: { title } })) } }),
      batchUpdate: async ({ requestBody }: { requestBody: { requests: { addSheet: { properties: { title: string } } }[] } }) => {
        await call("addSheets", { titles: requestBody.requests.map((r) => r.addSheet.properties.title) });
        return { data: {} };
      },
      values: {
        get: async ({ range }: { range: string }) => ({ data: { values: await call<unknown[][]>("get", { range }) } }),
        append: async ({ range, requestBody }: { range: string; requestBody: { values: unknown[][] } }) => {
          await call("append", { range, values: requestBody.values });
          return { data: {} };
        },
        update: async ({ range, requestBody }: { range: string; requestBody: { values: unknown[][] } }) => {
          await call("update", { range, values: requestBody.values });
          return { data: {} };
        },
        batchUpdate: async ({ requestBody }: { requestBody: { data: { range: string; values: unknown[][] }[] } }) => {
          await call("batchUpdate", { data: requestBody.data });
          return { data: {} };
        },
      },
    },
  };
  return client as unknown as sheets_v4.Sheets;
}

class Retryable extends Error {}

/** 연결 확인용: 스프레드시트 이름과 탭 목록 */
export async function pingAppsScript(url: string, token: string, fetchImpl: Fetch = fetch) {
  const client = createAppsScriptClient(url, token, fetchImpl);
  const res = await client.spreadsheets.get({ spreadsheetId: "", fields: "sheets.properties.title" });
  return (res.data.sheets ?? []).map((s) => s.properties?.title ?? "");
}
