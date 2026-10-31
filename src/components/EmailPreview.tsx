"use client";

import { useEffect, useRef, useState } from "react";
import { absolutize, copyRichHtml, copyText, downloadFile } from "@/lib/clipboard";
import { Button, cx } from "./ui";

type Toast = (msg: string, tone?: "info" | "error" | "success") => void;

/** 메일에 붙여 넣는 동작 모음: 리포트 보기·메일 본문 화면에서 같이 쓴다. 이미지 주소는 복사할 때 절대 주소로 바꾼다 */
export function ReportActions({ html, fragment, text, fileName, onToast, extra }: { html: string; fragment: string; text: string; fileName: string; onToast: Toast; extra?: React.ReactNode }) {
  const copyOutlook = async () => {
    try {
      const how = await copyRichHtml(absolutize(fragment), text);
      onToast(
        how === "clipboard-api" ? "리포트를 복사했습니다. 아웃룩 새 메일 본문에 Ctrl+V 하세요." : "본문을 복사했습니다(호환 모드). 메일 작성창에 Ctrl+V 하세요.",
        "success",
      );
    } catch (e) {
      onToast((e as Error).message, "error");
    }
  };
  const copyCode = async () => {
    try {
      await copyText(absolutize(html));
      onToast("HTML 코드를 복사했습니다.", "success");
    } catch (e) {
      onToast((e as Error).message, "error");
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" onClick={copyOutlook} title="표와 서식, 인포그래픽 그대로 복사됩니다. 메일 본문에 붙여 넣으세요">
        📋 메일 본문용 복사
      </Button>
      <Button onClick={copyCode}>{"</>"} HTML 코드 복사</Button>
      <Button onClick={() => downloadFile(fileName, absolutize(html))}>⬇ .html</Button>
      {extra}
    </div>
  );
}

export function EmailPreview({
  html,
  fragment,
  text,
  tables,
  fileName,
  onToast,
  extraActions,
}: {
  html: string;
  fragment: string;
  text: string;
  /** 인포그래픽을 표로 그린 예비 버전 */
  tables?: { html: string; fragment: string };
  fileName: string;
  onToast: Toast;
  extraActions?: React.ReactNode;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [mode, setMode] = useState<"image" | "table">("image");
  const [height, setHeight] = useState(1200);
  const frame = useRef<HTMLIFrameElement>(null);
  const cur = mode === "table" && tables ? tables : { html, fragment };

  const measure = () => {
    const doc = frame.current?.contentDocument;
    if (doc?.body) setHeight(Math.max(600, doc.documentElement.scrollHeight + 8));
  };
  useEffect(() => {
    const t1 = setTimeout(measure, 300);
    const t2 = setTimeout(measure, 1500); // 인포그래픽 이미지가 늦게 도착해도 높이를 다시 맞춤
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [cur.html, device]);

  const seg = (on: boolean) => cx("rounded px-3 py-1", on ? "bg-brand text-white" : "text-slate-600");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-sm">
          {(["desktop", "mobile"] as const).map((d) => (
            <button key={d} onClick={() => setDevice(d)} className={seg(device === d)}>
              {d === "desktop" ? "🖥 데스크톱" : "📱 모바일"}
            </button>
          ))}
        </div>
        {tables && (
          <div className="inline-flex items-center rounded-md border border-slate-300 bg-white p-0.5 text-sm" title="받는 쪽 메일에서 이미지가 보이지 않으면 '표'로 바꿔 복사하세요">
            <span className="px-2 text-xs text-slate-500">인포그래픽</span>
            <button onClick={() => setMode("image")} className={seg(mode === "image")}>이미지</button>
            <button onClick={() => setMode("table")} className={seg(mode === "table")}>표</button>
          </div>
        )}
        <div className="ml-auto">
          <ReportActions html={cur.html} fragment={cur.fragment} text={text} fileName={fileName} onToast={onToast} extra={extraActions} />
        </div>
      </div>
      <div className="flex justify-center overflow-x-auto rounded-lg border border-slate-200 bg-slate-200/60 p-4">
        <iframe
          ref={frame}
          title="newsletter-preview"
          srcDoc={cur.html}
          onLoad={measure}
          sandbox="allow-same-origin allow-popups"
          style={{ width: device === "desktop" ? 680 : 375, height }}
          className="rounded bg-white shadow-md transition-[width]"
        />
      </div>
    </div>
  );
}
