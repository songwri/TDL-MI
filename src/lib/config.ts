import path from "node:path";

/** 서버 전용 환경설정. 값이 없으면 해당 기능이 비활성(로컬 캐시 / 초안 모드)으로 동작한다. */
export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "",
  serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ?? "",
  serviceAccountKeyBase64: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 ?? "",
  dataDir: process.env.DATA_DIR || path.join(process.cwd(), "data"),
  lookbackDays: Number(process.env.COLLECT_LOOKBACK_DAYS || 14),
  miLookbackDays: Number(process.env.MI_LOOKBACK_DAYS || 180),
  newsletterName: process.env.NEWSLETTER_NAME || "TDL Market Intelligence",
  feedbackContact: process.env.NEWSLETTER_FEEDBACK_CONTACT || "물류혁신팀",
};

export const sheetsEnabled = () =>
  Boolean(config.spreadsheetId && (config.serviceAccountKeyPath || config.serviceAccountKeyBase64));

export const llmEnabled = () => Boolean(config.anthropicApiKey);
