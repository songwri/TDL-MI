"use client";

/**
 * 아웃룩 데스크톱 붙여넣기용 복사.
 * 1순위: Clipboard API 로 text/html + text/plain 동시 기록
 * 2순위: 숨김 contenteditable 영역에 렌더링 후 선택하여 execCommand('copy') (구형 브라우저/비보안 컨텍스트)
 */
export async function copyRichHtml(html: string, plain: string): Promise<"clipboard-api" | "selection"> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write && window.isSecureContext) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return "clipboard-api";
    } catch {
      /* 권한 거부 등 → 선택 방식으로 폴백 */
    }
  }
  const host = document.createElement("div");
  host.contentEditable = "true";
  host.style.cssText = "position:fixed;left:-99999px;top:0;opacity:0;pointer-events:none;";
  host.innerHTML = html;
  document.body.appendChild(host);
  const range = document.createRange();
  range.selectNodeContents(host);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  const okCopy = document.execCommand("copy");
  sel?.removeAllRanges();
  host.remove();
  if (!okCopy) throw new Error("복사에 실패했습니다. 브라우저 권한을 확인하세요.");
  return "selection";
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;left:-99999px;top:0;";
  document.body.appendChild(ta);
  ta.select();
  const okCopy = document.execCommand("copy");
  ta.remove();
  if (!okCopy) throw new Error("복사에 실패했습니다.");
}

export function downloadFile(name: string, content: string, type = "text/html;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 상대 주소 이미지(src="/api/charts/...")를 현재 접속 주소 기준 절대 주소로 바꾼다 (메일에서 열리도록) */
export function absolutize(html: string): string {
  return html.replace(/(src|href)="\/(?!\/)/g, `$1="${window.location.origin}/`);
}
