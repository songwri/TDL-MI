"use client";

import type { Article, IssueRelation } from "@/lib/types";
import { RelationTags } from "./RelationTags";
import { Badge, cx } from "./ui";

export type ArticleView = Article & { relations: IssueRelation[] };

export function ArticleCard({
  article: a,
  checked,
  onToggle,
  disabled,
}: {
  article: ArticleView;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cx(
        "flex cursor-pointer gap-3 rounded-lg border bg-white p-3 transition",
        checked ? "border-brand ring-2 ring-brand/20" : "border-slate-200 hover:border-slate-300",
        disabled && !checked && "opacity-60",
      )}
    >
      <input type="checkbox" className="mt-1 size-4 accent-[#a72b2b]" checked={checked} onChange={onToggle} disabled={disabled && !checked} />
      {a.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.thumbnail} alt="" className="hidden h-[72px] w-[108px] shrink-0 rounded object-cover sm:block" loading="lazy" />
      ) : (
        <div className="hidden h-[72px] w-[108px] shrink-0 items-center justify-center rounded bg-slate-100 text-2xl sm:flex">
          {a.region === "KR" ? "📰" : "🌐"}
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <Badge tone={a.region === "KR" ? "green" : "brand"}>{a.region === "KR" ? "국내" : "해외"}</Badge>
          <Badge tone="accent">{a.category}</Badge>
          <span className="font-medium text-slate-700">{a.source}</span>
          <span>· {a.publishedAt.slice(0, 10)}</span>
          {a.publishedInIssue ? <Badge tone="amber">제{a.publishedInIssue}호 게재</Badge> : null}
          {a.isSample ? <Badge>샘플</Badge> : null}
        </div>
        <a
          href={a.link}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="line-clamp-2 font-semibold leading-snug text-slate-900 hover:text-brand hover:underline"
        >
          {a.title}
        </a>
        {a.titleKo && a.titleKo !== a.title ? (
          <p lang="ko" className="line-clamp-2 text-[13px] leading-snug text-slate-500">
            <span className="mr-1 rounded bg-slate-100 px-1 py-px text-[10px] font-semibold text-slate-500">번역</span>
            {a.titleKo}
          </p>
        ) : null}
        <p className="line-clamp-2 text-sm text-slate-600">{a.summary}</p>
        <div className="flex flex-wrap gap-1">
          {a.keywords.slice(0, 6).map((k) => (
            <span key={k} className="text-[11px] text-slate-500">#{k}</span>
          ))}
        </div>
        <RelationTags relations={a.relations} />
      </div>
    </label>
  );
}
