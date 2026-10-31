/**
 * TDL TREND REPORT 마크 (TDL LAB 로고 응용)
 * 굵은 기하학 TDL 글자는 도형으로 그리고(폰트 차이 없음), 아래 오른쪽 정렬로 TREND REPORT 를 붙인다.
 * PNG 는 scripts/make-mark.ts 로 public/brand/ 에 만든다 (메일에 이미지로 들어감).
 */
export const MARK = { width: 240, height: 128, bg: "#161616", fg: "#FFFFFF", accent: "#A72B2B" } as const;

/** 메일·웹에서 쓰는 공개 경로 (비밀번호 제외 대상) */
export const MARK_PATH = "/brand/tdl-trend-report.png";
/** 표시 크기 (PNG 는 3배 해상도) */
export const MARK_DISPLAY = { width: 150, height: 80 } as const;
export const MARK_ALT = "TDL TREND REPORT";

export function markSvg(): string {
  const { width: W, height: H, bg, fg, accent } = MARK;
  const x = 24;
  const y = 24;
  const S = 16; // 획 두께
  const h = 60; // 글자 높이
  const letters =
    // T
    `<rect x="${x}" y="${y}" width="58" height="${S}"/>` +
    `<rect x="${x + 21}" y="${y}" width="${S}" height="${h}"/>` +
    // D (가운데가 빈 둥근 사각형)
    `<path fill-rule="evenodd" d="M${x + 68} ${y} H${x + 110} Q${x + 130} ${y} ${x + 130} ${y + 20} V${y + h - 20} Q${x + 130} ${y + h} ${x + 110} ${y + h} H${x + 68} Z ` +
    `M${x + 68 + S} ${y + S} V${y + h - S} H${x + 108} Q${x + 114} ${y + h - S} ${x + 114} ${y + h - S - 6} V${y + S + 6} Q${x + 114} ${y + S} ${x + 108} ${y + S} Z"/>` +
    // L
    `<rect x="${x + 140}" y="${y}" width="${S}" height="${h}"/>` +
    `<rect x="${x + 140}" y="${y + h - S}" width="52" height="${S}"/>`;
  const right = x + 192;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${MARK_ALT}">` +
    `<rect width="${W}" height="${H}" rx="6" fill="${bg}"/>` +
    `<g fill="${fg}">${letters}</g>` +
    `<rect x="${x}" y="${y + h + 17}" width="22" height="4" fill="${accent}"/>` +
    `<text x="${right}" y="${y + h + 24}" text-anchor="end" font-family="Pretendard" font-weight="700" font-size="14" letter-spacing="2.2" fill="${fg}">TREND REPORT</text>` +
    `</svg>`
  );
}
