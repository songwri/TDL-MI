"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Article, NewsletterIssue } from "@/lib/types";
import { EmailPreview } from "./EmailPreview";
import { Badge, api, useToasts } from "./ui";

/** HTML 문서에서 아웃룩 붙여넣기용 본문(body 내부)과 텍스트를 추출 */
function splitHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return { fragment: doc.body.innerHTML, text: doc.body.innerText || doc.body.textContent || "" };
}

export function IssueDetail({ issueNo }: { issueNo: number }) {
  const { push, view } = useToasts();
  const [data, setData] = useState<{ issue: NewsletterIssue; articles: Article[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parts, setParts] = useState<{ fragment: string; text: string } | null>(null);

  useEffect(() => {
    api<{ issue: NewsletterIssue; articles: Article[] }>(`/api/issues/${issueNo}`)
      .then((d) => {
        setData(d);
        setParts(splitHtml(d.issue.html));
      })
      .catch((e) => setError((e as Error).message));
  }, [issueNo]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data || !parts) return <p className="text-slate-500">불러오는 중…</p>;
  const { issue, articles } = data;

  return (
    <div className="space-y-5">
      {view}
      <Link href="/issues" className="text-sm text-slate-500 hover:text-brand">← 발행 이력</Link>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-brand">{issue.issueNo}차 입고</h1>
          <Badge>{issue.publishDate}</Badge>
          <span className="font-semibold">{issue.headline}</span>
        </div>
        <p className="text-sm text-slate-600"><b>메인 콘셉트:</b> {issue.concept}</p>
        <div className="flex flex-wrap gap-1">{issue.keywords.map((k) => <Badge key={k} tone="accent">#{k}</Badge>)}</div>
        <ul className="list-inside list-disc text-sm text-slate-700">
          {articles.map((a) => (
            <li key={a.id}><a href={a.link} target="_blank" rel="noreferrer" className="hover:text-brand hover:underline">{a.title}</a> <span className="text-slate-400">({a.source})</span></li>
          ))}
        </ul>
      </div>
      <EmailPreview html={issue.html} fragment={parts.fragment} text={parts.text} fileName={`NEWS-INBOUND-${issue.issueNo}차-${issue.publishDate}.html`} onToast={push} />
    </div>
  );
}
