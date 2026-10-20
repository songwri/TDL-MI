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
  newsletterName: process.env.NEWSLETTER_NAME || "NEWS/INBOUND",
  tagline: process.env.NEWSLETTER_TAGLINE || "레포냥이 물어 온 물류·로봇 트렌드",
  feedbackContact: process.env.NEWSLETTER_FEEDBACK_CONTACT || "테크이노베이션팀",
  /** 독자: '우리 ○○엔?' 박스와 프롬프트에 쓰인다 */
  audience: process.env.NEWSLETTER_AUDIENCE || "CL사업부",
  feedbackEmail: process.env.NEWSLETTER_FEEDBACK_EMAIL || "",
  surveyUrl: process.env.NEWSLETTER_SURVEY_URL || "",
  archiveUrl: process.env.NEWSLETTER_ARCHIVE_URL || "",
  /** 메일에 들어갈 캐릭터 이미지의 공개 기준 URL. 비우면 복사 시 현재 접속 주소로 변환 */
  assetBaseUrl: process.env.PUBLIC_ASSET_BASE_URL || "",
};

export const sheetsEnabled = () =>
  Boolean(config.spreadsheetId && (config.serviceAccountKeyPath || config.serviceAccountKeyBase64));

/**
 * 레터 작성 방식
 *  - claude-code (기본): 웹에서 작성 의뢰서를 저장 → Claude Code 에서 /write-letter 로 작성. API 토큰을 쓰지 않는다
 *  - api: 웹에서 Anthropic API 로 바로 생성 (ANTHROPIC_API_KEY 필요, 사용량만큼 과금)
 */
export const writerMode = (): "claude-code" | "api" =>
  process.env.LETTER_WRITER === "api" && config.anthropicApiKey ? "api" : "claude-code";

export const llmEnabled = () => writerMode() === "api";
