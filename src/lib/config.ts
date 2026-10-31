import os from "node:os";
import path from "node:path";

const onServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/** 서버 전용 환경설정. 값이 없으면 해당 기능이 비활성(로컬 캐시 / 초안 모드)으로 동작한다. */
export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "",
  serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ?? "",
  serviceAccountKeyBase64: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 ?? "",
  /** 무료 방식: 시트에 붙인 Apps Script 웹 앱 주소와 토큰 (구글 클라우드 불필요) */
  sheetsWebAppUrl: process.env.SHEETS_WEBAPP_URL ?? "",
  sheetsWebAppToken: process.env.SHEETS_WEBAPP_TOKEN ?? "",
  /** 키 JSON 파일 내용을 그대로 붙여 넣는 방식 (웹 호스팅 환경변수용) */
  serviceAccountKeyJson: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON ?? "",
  /** 서버리스는 쓰기 가능한 곳이 임시 폴더뿐이라 캐시만 둔다 */
  dataDir: process.env.DATA_DIR || (onServerless ? path.join(os.tmpdir(), "tdl-mi") : path.join(process.cwd(), "data")),
  /** 웹 접속 비밀번호 (비우면 잠금 없음) */
  appPassword: process.env.APP_PASSWORD ?? "",
  lookbackDays: Number(process.env.COLLECT_LOOKBACK_DAYS || 14),
  miLookbackDays: Number(process.env.MI_LOOKBACK_DAYS || 180),
  newsletterName: process.env.NEWSLETTER_NAME || "TDL Trend",
  tagline: process.env.NEWSLETTER_TAGLINE || "물류·로봇 Market Intelligence",
  feedbackContact: process.env.NEWSLETTER_FEEDBACK_CONTACT || "테크이노베이션팀",
  /** 배포 대상: 헤더·시사점 제목·프롬프트에 쓰인다 */
  audience: process.env.NEWSLETTER_AUDIENCE || "CL사업부",
  feedbackEmail: process.env.NEWSLETTER_FEEDBACK_EMAIL || "",
};

/** 시트 연결 방식: Apps Script(무료, 권장) 또는 서비스 계정(구글 클라우드) */
export const sheetsVia = (): "apps-script" | "service-account" | null => {
  if (config.sheetsWebAppUrl && config.sheetsWebAppToken) return "apps-script";
  if (config.spreadsheetId && (config.serviceAccountKeyPath || config.serviceAccountKeyBase64 || config.serviceAccountKeyJson)) return "service-account";
  return null;
};

export const sheetsEnabled = () => sheetsVia() !== null;

/**
 * 저장 방식
 *  - sheets: 구글 시트가 유일한 원본. 서버에는 임시 캐시만 둔다 (웹 호스팅 기본값, 여러 명이 같이 쓸 때)
 *  - local:  data/db.json 이 원본, 시트가 있으면 같이 기록 (내 PC 혼자 쓸 때)
 */
export const storeMode = (): "sheets" | "local" => {
  const m = process.env.STORE_MODE;
  if (m === "sheets" || m === "local") return m;
  return onServerless ? "sheets" : "local";
};

/**
 * 레터 작성 방식
 *  - claude-code (기본): 웹에서 작성 의뢰서를 저장 → Claude Code 에서 /write-letter 로 작성. API 토큰을 쓰지 않는다
 *  - api: 웹에서 Anthropic API 로 바로 생성 (ANTHROPIC_API_KEY 필요, 사용량만큼 과금)
 */
export const writerMode = (): "claude-code" | "api" =>
  process.env.LETTER_WRITER === "api" && config.anthropicApiKey ? "api" : "claude-code";

export const llmEnabled = () => writerMode() === "api";
