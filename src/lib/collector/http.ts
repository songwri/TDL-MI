const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 TDL-MI-NewsletterBot/1.0";

export async function fetchText(url: string, timeoutMs = 15_000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return decode(buf, res.headers.get("content-type") ?? "");
  } catch (e) {
    if ((e as Error).message.startsWith("HTTP ")) throw e;
    const cause = (e as { cause?: { code?: string; message?: string } }).cause;
    const reason =
      ctrl.signal.aborted ? `${timeoutMs / 1000}초 안에 응답 없음` : cause?.code === "ENOTFOUND" ? "주소를 찾을 수 없음(DNS)" : (cause?.code ?? cause?.message ?? (e as Error).message);
    throw new Error(`접속 실패: ${reason} · ${url}`);
  } finally {
    clearTimeout(timer);
  }
}

/** 국내 일부 매체의 EUC-KR 응답 대응 */
function decode(buf: Buffer, contentType: string): string {
  const head = buf.subarray(0, 2048).toString("latin1");
  const charset =
    contentType.match(/charset=([\w-]+)/i)?.[1] ??
    head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ??
    head.match(/encoding=["']([\w-]+)["']/i)?.[1] ??
    "utf-8";
  try {
    return new TextDecoder(charset.toLowerCase()).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}
