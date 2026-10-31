"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChannelSummary } from "@/lib/collector/channels";
import { Badge, Button, api, cx, useToasts } from "./ui";

interface Summary {
  channels: ChannelSummary[];
  unattributed: number;
  total: number;
}
interface Check {
  ok: boolean;
  error?: string;
  method?: { type: "rss" | "html"; url: string; via?: string };
  count?: number;
  ms?: number;
  samples?: { title: string; link: string; publishedAt?: string }[];
}

const TYPE_LABEL = { auto: "자동 탐지", rss: "RSS", html: "HTML 링크" } as const;
const day = (iso?: string) => (iso ? iso.slice(0, 10) : "-");
const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

export function SourcesTable() {
  const { push, view } = useToasts();
  const [data, setData] = useState<Summary | null>(null);
  const [checks, setChecks] = useState<Record<string, Check | "running">>({});
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<Summary>("/api/sources"));
    } catch (e) {
      push((e as Error).message, "error");
    }
  }, [push]);
  useEffect(() => {
    load();
  }, [load]);

  const check = async (id: string) => {
    setChecks((c) => ({ ...c, [id]: "running" }));
    setOpen(id);
    try {
      const r = await api<Check>("/api/sources/check", { json: { id } });
      setChecks((c) => ({ ...c, [id]: r }));
    } catch (e) {
      setChecks((c) => ({ ...c, [id]: { ok: false, error: (e as Error).message } }));
    }
  };

  const checkAll = async () => {
    for (const ch of data?.channels.filter((c) => c.enabled) ?? []) await check(ch.id);
  };

  if (!data) return <p className="text-slate-500">불러오는 중…</p>;
  const active = data.channels.filter((c) => c.enabled).length;

  return (
    <div className="space-y-4">
      {view}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-brand">수집 채널</h1>
        <span className="text-sm text-slate-500">
          {data.channels.length}곳 중 사용 {active}곳 · 시트에 쌓인 기사 {data.total}건
        </span>
        <div className="ml-auto flex gap-2">
          <Button onClick={load}>↻ 새로고침</Button>
          <Button variant="primary" onClick={checkAll}>사용 중인 채널 모두 점검</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">채널</th>
              <th className="px-3 py-2">구분</th>
              <th className="px-3 py-2">수집 방식</th>
              <th className="px-3 py-2">주소</th>
              <th className="px-3 py-2 text-right">쌓인 기사</th>
              <th className="px-3 py-2 text-right">최근 14일</th>
              <th className="px-3 py-2">최근 기사</th>
              <th className="px-3 py-2">최근 수집</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {data.channels.map((c) => {
              const chk = checks[c.id];
              return (
                <tr key={c.id} className={cx("border-t border-slate-100 align-top", !c.enabled && "text-slate-400")}>
                  <td className="px-3 py-2">{c.enabled ? <Badge tone="green">사용</Badge> : <Badge>중지</Badge>}</td>
                  <td className="px-3 py-2 font-medium">
                    {c.name}
                    {c.filtered && <div className="text-[11px] font-normal text-slate-500" title="물류·로봇 키워드가 있는 기사만 저장합니다">키워드 필터</div>}
                  </td>
                  <td className="px-3 py-2">{c.region === "KR" ? "국내" : "해외"}</td>
                  <td className="px-3 py-2">{TYPE_LABEL[c.type]}</td>
                  <td className="px-3 py-2">
                    <a href={c.url} target="_blank" rel="noreferrer" className="text-brand hover:underline" title={c.url}>{host(c.url)}</a>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.articles}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.recent}</td>
                  <td className="whitespace-nowrap px-3 py-2">{day(c.lastPublishedAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{day(c.lastCollectedAt)}</td>
                  <td className="px-3 py-2 text-right">
                    <Button className="px-2 py-1 text-xs" onClick={() => check(c.id)} disabled={chk === "running"}>
                      {chk === "running" ? "점검 중…" : chk ? (chk.ok ? "✔ 다시 점검" : "✘ 다시 점검") : "점검"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.unattributed > 0 && (
        <p className="text-xs text-slate-500">
          채널을 알 수 없는 기사 {data.unattributed}건: 채널 기록이 생기기 전에 쌓인 기사이거나, Google 뉴스처럼 여러 매체의 기사를 모아 오는 채널의 기사입니다.
        </p>
      )}

      {open && checks[open] && checks[open] !== "running" && (
        <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
          {(() => {
            const chk = checks[open] as Check;
            const name = data.channels.find((c) => c.id === open)?.name;
            return chk.ok ? (
              <>
                <h2 className="font-bold text-slate-800">
                  ✔ {name}: 접속됨 · 기사 {chk.count}건 확인 · {((chk.ms ?? 0) / 1000).toFixed(1)}초
                </h2>
                <p className="text-xs text-slate-500">
                  방식: {chk.method?.type === "rss" ? "RSS 피드" : "HTML 링크 추정"}
                  {chk.method?.via === "link-tag" ? " (홈페이지에 표시된 피드)" : chk.method?.via === "common-path" ? " (흔한 피드 주소)" : ""} · {chk.method?.url}
                </p>
                <ul className="list-inside list-disc text-sm">
                  {chk.samples?.map((s) => (
                    <li key={s.link}>
                      <a href={s.link} target="_blank" rel="noreferrer" className="hover:text-brand hover:underline">{s.title}</a>
                      {s.publishedAt && <span className="text-slate-400"> · {s.publishedAt.slice(0, 10)}</span>}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-500">점검은 접속만 확인하며 기사를 저장하지 않습니다.</p>
              </>
            ) : (
              <>
                <h2 className="font-bold text-red-700">✘ {name}: 접속하지 못했습니다</h2>
                <p className="text-sm text-slate-700">{chk.error}</p>
              </>
            );
          })()}
        </section>
      )}

      <p className="text-xs leading-relaxed text-slate-500">
        채널을 추가하거나 빼려면 저장소의 <code className="rounded bg-slate-100 px-1">src/config/sources.ts</code> 를 고칩니다(GitHub에서 파일을 열고 연필 아이콘으로 편집 → Commit).
        <code className="rounded bg-slate-100 px-1">enabled: false</code> 로 두면 수집을 멈춥니다. 사이트 주소만 넣어도 RSS를 자동으로 찾습니다.
      </p>
    </div>
  );
}
