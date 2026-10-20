"use client";

import { useEffect, useRef, useState } from "react";
import { absolutizeAssets, copyRichHtml, copyText, downloadFile } from "@/lib/clipboard";
import { Button, cx } from "./ui";

export function EmailPreview({
  html,
  fragment,
  text,
  fileName,
  onToast,
  extraActions,
}: {
  html: string;
  fragment: string;
  text: string;
  fileName: string;
  onToast: (msg: string, tone?: "info" | "error" | "success") => void;
  extraActions?: React.ReactNode;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [height, setHeight] = useState(1200);
  const frame = useRef<HTMLIFrameElement>(null);

  const measure = () => {
    const doc = frame.current?.contentDocument;
    if (doc?.body) setHeight(Math.max(600, doc.documentElement.scrollHeight + 8));
  };
  useEffect(() => {
    const t = setTimeout(measure, 300); // 이미지 로딩 후 재측정
    return () => clearTimeout(t);
  }, [html, device]);

  const copyOutlook = async () => {
    try {
      const how = await copyRichHtml(absolutizeAssets(fragment), text);
      onToast(
        how === "clipboard-api"
          ? "아웃룩용 본문을 복사했습니다. 메일 작성창에 Ctrl+V 하세요."
          : "본문을 복사했습니다(호환 모드). 메일 작성창에 Ctrl+V 하세요.",
        "success",
      );
    } catch (e) {
      onToast((e as Error).message, "error");
    }
  };
  const copyCode = async () => {
    try {
      await copyText(absolutizeAssets(html));
      onToast("HTML 코드를 복사했습니다.", "success");
    } catch (e) {
      onToast((e as Error).message, "error");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-sm">
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={cx("rounded px-3 py-1", device === d ? "bg-brand text-white" : "text-slate-600")}
            >
              {d === "desktop" ? "🖥 데스크톱" : "📱 모바일"}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="accent" onClick={copyOutlook} title="text/html + text/plain 동시 복사">
            📋 아웃룩용 본문 복사
          </Button>
          <Button onClick={copyCode}>{"</>"} HTML 코드 복사</Button>
          <Button onClick={() => downloadFile(fileName, absolutizeAssets(html))}>⬇ .html</Button>
          {extraActions}
        </div>
      </div>
      <div className="flex justify-center overflow-x-auto rounded-lg border border-slate-200 bg-slate-200/60 p-4">
        <iframe
          ref={frame}
          title="newsletter-preview"
          srcDoc={html}
          onLoad={measure}
          sandbox="allow-same-origin allow-popups"
          style={{ width: device === "desktop" ? 640 : 375, height }}
          className="rounded bg-white shadow-md transition-[width]"
        />
      </div>
    </div>
  );
}
