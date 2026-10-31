import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** 이미지 주소 서명: 주소를 아는 사람만 이미지를 받을 수 있게 (비밀번호 없이 메일에서 열려야 하므로) */
const secret = () => process.env.CHART_SECRET || process.env.APP_PASSWORD || process.env.SHEETS_WEBAPP_TOKEN || "tdl-trend-local";

export function chartSig(issueNo: number, chart: string): string {
  return createHmac("sha256", secret()).update(`${issueNo}:${chart}`).digest("base64url").slice(0, 22);
}

export function verifyChartSig(issueNo: number, chart: string, sig: string | null): boolean {
  if (!sig) return false;
  const a = Buffer.from(chartSig(issueNo, chart));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const contentVersion = (json: unknown) => createHash("sha1").update(JSON.stringify(json)).digest("hex").slice(0, 10);
