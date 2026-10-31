"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Article, NewsletterIssue, ViewerData } from "@/lib/types";
import { EmailPreview, ReportActions } from "./EmailPreview";
import { ReportViewer } from "./report/ReportViewer";
import { api, cx, useToasts } from "./ui";

interface Render {
  viewer: ViewerData;
  html: string;
  fragment: string;
  text: string;
  tables: { html: string; fragment: string };
}

/** HTML 문서에서 아웃룩 붙여넣기용 본문(body 내부)과 텍스트를 추출 (구조화 데이터가 없는 예전 호) */
function splitHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return { fragment: doc.body.innerHTML, text: doc.body.innerText || doc.body.textContent || "" };
}

export function IssueDetail({ issueNo }: { issueNo: number }) {
  const { push, view } = useToasts();
  const [data, setData] = useState<{ issue: NewsletterIssue; articles: Article[]; render: Render | null } | null>(null);
  const [legacy, setLegacy] = useState<{ fragment: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"view" | "mail">("view");

  useEffect(() => {
    api<{ issue: NewsletterIssue; articles: Article[]; render: Render | null }>(`/api/issues/${issueNo}`)
      .then((d) => {
        setData(d);
        if (!d.render) setLegacy(splitHtml(d.issue.html));
      })
      .catch((e) => setError((e as Error).message));
  }, [issueNo]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data || (!data.render && !legacy)) return <p className="text-slate-500">불러오는 중…</p>;
  const { issue, render } = data;
  const file = `TDL-Trend-제${issue.issueNo}호-${issue.publishDate}.html`;
  const showView = tab === "view" && render && issue.content;
  const mail = render ?? { html: issue.html, fragment: legacy!.fragment, text: legacy!.text, tables: undefined };

  return (
    <div className="space-y-4">
      {view}
      <Link href="/issues" className="text-sm text-slate-500 hover:text-brand">← 발행 이력</Link>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-slate-300 p-0.5 text-sm">
          {([["view", "리포트 보기"], ["mail", "메일 본문"]] as const)
            .filter(([k]) => k === "mail" || (render && issue.content))
            .map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} className={cx("rounded px-3 py-1", (k === "view") === Boolean(showView) ? "bg-slate-800 text-white" : "text-slate-600")}>
                {label}
              </button>
            ))}
        </div>
        {showView && (
          <div className="ml-auto">
            <ReportActions html={mail.html} fragment={mail.fragment} text={mail.text} fileName={file} onToast={push} />
          </div>
        )}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {showView ? (
          <ReportViewer content={issue.content!} viewer={render!.viewer} />
        ) : (
          <EmailPreview html={mail.html} fragment={mail.fragment} text={mail.text} tables={mail.tables} fileName={file} onToast={push} />
        )}
      </div>
    </div>
  );
}
