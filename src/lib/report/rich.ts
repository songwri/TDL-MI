/**
 * 리포트 문장 속 하이라이트 표기: **핵심 구절**
 * - 메일·웹·텍스트 렌더러가 같은 규칙으로 해석한다
 * - 짝이 맞지 않는 별표는 그대로 글자로 둔다
 */
export interface Piece {
  text: string;
  hl: boolean;
}

export function parseRich(s: string): Piece[] {
  const out: Piece[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), hl: false });
    out.push({ text: m[1], hl: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), hl: false });
  return out;
}

/** 텍스트 버전: 별표를 없애고 「」로 표시 */
export const plainRich = (s: string) => parseRich(s).map((p) => (p.hl ? `「${p.text}」` : p.text)).join("");

/** 별표만 지운 순수 문장 (제목·검색용) */
export const stripRich = (s: string) => parseRich(s).map((p) => p.text).join("");
